"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  BookOpenCheck,
  FileCheck2,
  FileSignature,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { SignaturePad } from "@/components/installment/signature-pad";
import { PaymentPlanSummary } from "@/components/installment/payment-plan-summary";
import { InstallmentContractModal } from "@/components/installment/installment-contract-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { renderInstallmentContract } from "@/lib/installment/contract-render";
import {
  type InstallmentContractOffer,
  type InstallmentDocumentType,
  type InstallmentDraftResponse,
  type InstallmentProductSummary,
} from "@/lib/installment/types";
import {
  missingInstallmentDocuments,
  normalizeApplicantName,
  normalizeOptionalEmail,
  normalizeTurkishPhone,
  productSummaryStorageLabel,
} from "@/lib/installment/validation";
import {
  calculatePaymentPlan,
  describePaymentSchedule,
  formatBasisPoints,
  formatMinorCurrency,
} from "@/lib/payment-plan/engine";
import type { PaymentPlanOffer } from "@/lib/payment-plan/types";

type SignatureValue = { file: File; previewUrl: string };
type FileKey = Exclude<InstallmentDocumentType, "signature">;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 4 * 1024 * 1024;

function newIdempotencyKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function FileField({
  id,
  label,
  description,
  file,
  error,
  residence = false,
  onChange,
}: {
  id: FileKey;
  label: string;
  description: string;
  file: File | null;
  error?: string;
  residence?: boolean;
  onChange: (file: File | null, error?: string) => void;
}) {
  function select(next: File | null) {
    if (!next) return onChange(null);
    const allowed =
      IMAGE_TYPES.has(next.type) ||
      (residence && next.type === "application/pdf");
    if (/hei[cf]/i.test(next.name) || /hei[cf]/i.test(next.type))
      return onChange(
        null,
        "HEIC/HEIF desteklenmiyor. Lütfen JPG, PNG veya WebP olarak yükleyin.",
      );
    if (!allowed)
      return onChange(
        null,
        residence
          ? "PDF, JPEG, PNG veya WebP dosyası seçin."
          : "JPEG, PNG veya WebP görseli seçin.",
      );
    if (next.size > MAX_SIZE)
      return onChange(null, "Dosya boyutu en fazla 4 MB olabilir.");
    onChange(next);
  }
  return (
    <div>
      <label
        htmlFor={id}
        className={`block cursor-pointer rounded-xl border border-dashed p-4 transition-colors ${error ? "border-red-400 bg-red-50/50" : "border-zinc-300 bg-zinc-50 hover:border-zinc-500"}`}
      >
        <span className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm">
            {file ? (
              <FileCheck2 className="size-5 text-emerald-600" />
            ) : (
              <Upload className="size-5 text-zinc-600" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-zinc-950">
              {label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">
              {file
                ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
                : description}
            </span>
          </span>
        </span>
      </label>
      <input
        id={id}
        type="file"
        className="sr-only"
        accept={
          residence
            ? "image/jpeg,image/png,image/webp,application/pdf,.pdf"
            : "image/jpeg,image/png,image/webp"
        }
        onChange={(event) => select(event.target.files?.[0] ?? null)}
      />
      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InstallmentApplicationForm({
  product,
  contract,
  paymentPlan,
}: {
  product: InstallmentProductSummary;
  contract: InstallmentContractOffer | null;
  paymentPlan: PaymentPlanOffer | null;
}) {
  const idempotencyKey = useRef(newIdempotencyKey());
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState<Record<FileKey, File | null>>({
    identity_front: null,
    identity_back: null,
    residence: null,
  });
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [contractAcknowledged, setContractAcknowledged] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(
    paymentPlan?.plan.installmentCount ?? 12,
  );
  const [contractOpen, setContractOpen] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successNumber, setSuccessNumber] = useState("");
  const [downPaymentWarningAcknowledged, setDownPaymentWarningAcknowledged] =
    useState(false);
  const [downPaymentConfirmed, setDownPaymentConfirmed] = useState(false);
  const selectedPaymentPlan = useMemo(
    () =>
      paymentPlan
        ? calculatePaymentPlan({
            paymentType: "installment_application",
            productPriceMinor: paymentPlan.plan.productPriceMinor,
            installmentCount,
            config: paymentPlan.config,
          })
        : null,
    [installmentCount, paymentPlan],
  );
  const renderedContract = useMemo(() => {
    if (!contract || !selectedPaymentPlan) return "";
    return renderInstallmentContract(contract.contentHtml, {
      customer_name:
        normalizeApplicantName(applicantName) ?? "Ad Soyad bilgisi girilmedi",
      product_name: product.productName,
      variant_name: product.variantTitle ?? "Varyantsız ürün",
      product_price: formatCurrency(product.price),
      application_date: new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "long",
        timeZone: "Europe/Istanbul",
      }).format(new Date(contract.presentedAt)),
      down_payment_rate: `%${formatBasisPoints(selectedPaymentPlan.downPaymentRateBps)}`,
      down_payment_amount: formatMinorCurrency(
        selectedPaymentPlan.downPaymentAmountMinor,
      ),
      remaining_principal: formatMinorCurrency(
        selectedPaymentPlan.remainingPrincipalMinor,
      ),
      finance_charge_rate: `%${formatBasisPoints(selectedPaymentPlan.financeChargeRateBps)}`,
      finance_charge_amount: formatMinorCurrency(
        selectedPaymentPlan.financeChargeAmountMinor,
      ),
      installment_count: `${selectedPaymentPlan.installmentCount} Ay`,
      installment_schedule: describePaymentSchedule(
        selectedPaymentPlan.installmentSchedule,
      ),
      total_payable: formatMinorCurrency(selectedPaymentPlan.totalPayableMinor),
    });
  }, [applicantName, contract, product, selectedPaymentPlan]);

  function validate() {
    const next: Record<string, string> = {};
    if (!normalizeApplicantName(applicantName))
      next.applicantName = "Ad soyad alanını kontrol edin.";
    if (!normalizeTurkishPhone(phone))
      next.phone = "05xx xxx xx xx biçiminde geçerli bir cep telefonu girin.";
    if (normalizeOptionalEmail(email) === undefined)
      next.email = "E-posta adresini kontrol edin.";
    const missingDocuments = missingInstallmentDocuments({
      ...files,
      signature,
    });
    if (missingDocuments.includes("identity_front"))
      next.identity_front = "Kimliğinizin ön yüzünü yükleyin.";
    if (missingDocuments.includes("identity_back"))
      next.identity_back = "Kimliğinizin arka yüzünü yükleyin.";
    if (missingDocuments.includes("residence"))
      next.residence = "İkametgâh belgenizi yükleyin.";
    if (missingDocuments.includes("signature"))
      next.signature = "Lütfen imzanızı atın.";
    if (!contract)
      next.contract =
        "Başvuru sözleşmesi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
    else if (!contractAcknowledged)
      next.contract = "Elden Taksitli Satış Sözleşmesini kabul edin.";
    if (!paymentPlan || !selectedPaymentPlan)
      next.paymentPlan =
        "Ödeme planı şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function openReview() {
    if (!validate()) return;
    setReviewing(true);
    window.setTimeout(
      () =>
        document
          .getElementById("application-review")
          ?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  }

  async function json<T>(response: Response): Promise<T> {
    const payload = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || "İşlem tamamlanamadı.");
    return payload;
  }

  async function submit() {
    if (!validate()) {
      setReviewing(false);
      return;
    }
    const next: Record<string, string> = {};
    if (!termsAcknowledged) next.terms = "Başvuru bilgilendirmesini onaylayın.";
    if (!privacyAcknowledged)
      next.privacy = "KVKK aydınlatma metnini okuduğunuzu belirtin.";
    if (Object.keys(next).length) {
      setErrors((current) => ({ ...current, ...next }));
      return;
    }
    if (!signature) return;
    setBusy(true);
    setProgress(5);
    setErrors({});
    try {
      const draft = await json<InstallmentDraftResponse>(
        await fetch("/api/installment-applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.productId,
            variantId: product.variantId,
            idempotencyKey: idempotencyKey.current,
            applicantName,
            phone,
            email,
            contractOfferToken: contract?.offerToken,
            paymentPlanOfferToken: paymentPlan?.offerToken,
            installmentCount,
          }),
        }),
      );
      const uploads: Array<[InstallmentDocumentType, File]> = [
        ["identity_front", files.identity_front!],
        ["identity_back", files.identity_back!],
        ["residence", files.residence!],
        ["signature", signature.file],
      ];
      for (let index = 0; index < uploads.length; index += 1) {
        const [type, file] = uploads[index];
        const form = new FormData();
        form.set("file", file);
        await json(
          await fetch(
            `/api/installment-applications/${draft.applicationId}/documents/${type}`,
            { method: "POST", body: form },
          ),
        );
        setProgress(15 + Math.round(((index + 1) / uploads.length) * 70));
      }
      const submitted = await json<InstallmentDraftResponse>(
        await fetch(
          `/api/installment-applications/${draft.applicationId}/submit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              privacyNoticeAcknowledged: true,
              applicationTermsAcknowledged: true,
              contractAccepted: contractAcknowledged,
            }),
          },
        ),
      );
      setProgress(100);
      setSuccessNumber(submitted.applicationNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setErrors({
        submit:
          caught instanceof Error ? caught.message : "Başvuru gönderilemedi.",
      });
      setBusy(false);
    }
  }

  if (!downPaymentWarningAcknowledged)
    return (
      <Card
        className="mx-auto max-w-xl border-amber-300 bg-amber-50/70 shadow-lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="down-payment-warning-title"
        aria-describedby="down-payment-warning-description"
      >
        <CardContent className="py-8 text-center sm:px-10 sm:py-10">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-amber-100 ring-8 ring-amber-50">
            <AlertTriangle
              className="size-8 text-amber-700"
              aria-hidden="true"
            />
          </span>
          <h1
            id="down-payment-warning-title"
            className="mt-6 text-xl font-black tracking-tight text-zinc-950 sm:text-2xl"
          >
            Başvuru Öncesi Önemli Uyarı
          </h1>
          <p
            id="down-payment-warning-description"
            className="mx-auto mt-4 max-w-md text-base font-bold leading-7 text-zinc-800 sm:text-lg sm:leading-8"
          >
            Elden taksit başvurunuz onaylanması durumunda ilk peşinat ödenmesi
            zorunludur.
          </p>
          {selectedPaymentPlan ? (
            <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-amber-300 bg-white px-5 py-4">
              <p className="text-sm font-semibold text-zinc-600">
                Ödenmesi gereken ilk peşinat
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-zinc-950">
                {formatMinorCurrency(
                  selectedPaymentPlan.downPaymentAmountMinor,
                )}
              </p>
            </div>
          ) : (
            <p className="mx-auto mt-5 max-w-md rounded-xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
              Peşinat tutarı şu anda hesaplanamıyor. Lütfen daha sonra tekrar
              deneyin.
            </p>
          )}
          <label className="mx-auto mt-5 flex max-w-md cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-white p-4 text-left text-sm font-semibold leading-6 text-zinc-800">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-red-600"
              checked={downPaymentConfirmed}
              disabled={!selectedPaymentPlan}
              onChange={(event) =>
                setDownPaymentConfirmed(event.target.checked)
              }
            />
            <span>
              Başvurum onaylanırsa{" "}
              {selectedPaymentPlan
                ? formatMinorCurrency(
                    selectedPaymentPlan.downPaymentAmountMinor,
                  )
                : "belirtilen"}{" "}
              tutarındaki ilk peşinatı ödeyebilirim.
            </span>
          </label>
          <Button
            size="lg"
            className="mt-7 w-full sm:w-auto sm:min-w-64"
            disabled={!selectedPaymentPlan || !downPaymentConfirmed}
            onClick={() => setDownPaymentWarningAcknowledged(true)}
          >
            Okudum, Başvuruya Devam Et
          </Button>
        </CardContent>
      </Card>
    );

  if (successNumber)
    return (
      <Card className="mx-auto max-w-2xl border-emerald-200 bg-emerald-50/40">
        <CardContent className="py-10 text-center sm:py-14">
          <CheckCircle2
            className="mx-auto size-14 text-emerald-600"
            aria-hidden="true"
          />
          <h1 className="mt-5 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
            Başvurunuz Alındı
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-600 sm:text-base">
            Elden taksit başvurunuz başarıyla alınmıştır ve değerlendirme
            sürecine aktarılmıştır. Başvurunuz incelendikten sonra tarafınıza
            bilgi verilecektir.
          </p>
          <p className="mt-6 rounded-xl bg-white px-4 py-3 font-mono text-sm font-bold text-zinc-900 shadow-sm">
            Başvuru No: {successNumber}
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Bu ekran otomatik onay veya sipariş oluşturulduğu anlamına gelmez.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Sözleşme kabulünüz ve imzanız başvurunuzla birlikte kaydedilmiştir.
          </p>
        </CardContent>
      </Card>
    );

  const storage = productSummaryStorageLabel(product);
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardContent>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid aspect-square w-full max-w-36 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-50">
                {product.imageUrl ? (
                  // Supabase image hosts are dynamic in this production project.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.productName}
                    className="size-full object-contain p-3"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Başvuru Ürünü
                </p>
                <h1 className="mt-2 text-xl font-black tracking-tight text-zinc-950">
                  {product.variantTitle || product.productName}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
                  {product.color ? (
                    <span className="rounded-full bg-zinc-100 px-3 py-1">
                      {product.color}
                    </span>
                  ) : null}
                  {storage ? (
                    <span className="rounded-full bg-zinc-100 px-3 py-1">
                      {storage}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    SKU: {product.sku}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-zinc-950">
                  {formatCurrency(product.price)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-zinc-950">
                İletişim Bilgileri
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Başvurunun değerlendirilmesi için yalnız gerekli temel bilgileri
                istiyoruz.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-zinc-800 sm:col-span-2">
                Ad Soyad
                <Input
                  className="mt-2"
                  autoComplete="name"
                  value={applicantName}
                  invalid={Boolean(errors.applicantName)}
                  onChange={(event) => {
                    setApplicantName(event.target.value);
                    setContractAcknowledged(false);
                    setErrors((current) => ({ ...current, contract: "" }));
                  }}
                />
                {errors.applicantName ? (
                  <span className="mt-1 block text-xs text-red-700">
                    {errors.applicantName}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-bold text-zinc-800">
                Telefon Numarası
                <Input
                  className="mt-2"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0534 872 95 79"
                  value={phone}
                  invalid={Boolean(errors.phone)}
                  onChange={(event) => setPhone(event.target.value)}
                />
                {errors.phone ? (
                  <span className="mt-1 block text-xs text-red-700">
                    {errors.phone}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-bold text-zinc-800">
                E-posta{" "}
                <span className="font-normal text-zinc-500">(opsiyonel)</span>
                <Input
                  className="mt-2"
                  type="email"
                  autoComplete="email"
                  value={email}
                  invalid={Boolean(errors.email)}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {errors.email ? (
                  <span className="mt-1 block text-xs text-red-700">
                    {errors.email}
                  </span>
                ) : null}
              </label>
            </div>
          </CardContent>
        </Card>

        <Card
          className={paymentPlan ? undefined : "border-red-200 bg-red-50/30"}
        >
          <CardContent className="space-y-5">
            {paymentPlan && selectedPaymentPlan ? (
              <>
                <PaymentPlanSummary plan={selectedPaymentPlan} />
                <fieldset>
                  <legend className="text-sm font-bold text-zinc-800">
                    Taksit sayısını değiştir
                  </legend>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {paymentPlan.config.installmentCounts.map((count) => (
                      <button
                        key={count}
                        type="button"
                        aria-pressed={installmentCount === count}
                        onClick={() => {
                          setInstallmentCount(count);
                          setDownPaymentConfirmed(false);
                          setDownPaymentWarningAcknowledged(false);
                          setContractAcknowledged(false);
                          setErrors((current) => ({
                            ...current,
                            contract: "",
                            paymentPlan: "",
                          }));
                        }}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${installmentCount === count ? "border-red-600 bg-red-50 text-red-700" : "border-zinc-200 bg-white text-zinc-800"}`}
                      >
                        {count} Ay
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Plan değiştiğinde sözleşmeyi yeniden okuyup kabul etmeniz
                    gerekir.
                  </p>
                </fieldset>
              </>
            ) : (
              <p
                className="rounded-xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
                role="alert"
              >
                Ödeme planı şu anda kullanılamıyor. Lütfen daha sonra tekrar
                deneyin.
              </p>
            )}
            {errors.paymentPlan ? (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {errors.paymentPlan}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={contract ? undefined : "border-red-200 bg-red-50/30"}>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-100">
                <BookOpenCheck className="size-5 text-zinc-700" />
              </span>
              <div>
                <h2 className="text-lg font-black text-zinc-950">
                  Elden Taksitli Satış Sözleşmesi
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  İmzanızı atmadan önce sözleşmenin tamamını okuyup kabulünüzü
                  belirtin.
                </p>
              </div>
            </div>
            {contract ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      {contract.title}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setContractOpen(true)}
                  >
                    Sözleşmenin Tamamını Gör
                  </Button>
                </div>
                <div
                  className="rich-product-content break-words rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-700 sm:p-6 sm:text-base sm:leading-8"
                  // Template HTML is strictly sanitized server-side and every
                  // dynamic value is HTML-escaped before this render.
                  dangerouslySetInnerHTML={{ __html: renderedContract }}
                />
                <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-semibold leading-6 text-zinc-800">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 shrink-0 accent-red-600"
                    checked={contractAcknowledged}
                    onChange={(event) => {
                      setContractAcknowledged(event.target.checked);
                      if (event.target.checked)
                        setErrors((current) => ({
                          ...current,
                          contract: "",
                        }));
                    }}
                  />
                  <span>
                    Elden Taksitli Satış Sözleşmesini okudum ve kabul ediyorum.
                  </span>
                </label>
              </>
            ) : (
              <p
                className="rounded-xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
                role="alert"
              >
                Başvuru sözleşmesi şu anda kullanılamıyor. Lütfen daha sonra
                tekrar deneyin.
              </p>
            )}
            {errors.contract ? (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {errors.contract}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-zinc-950">
                Başvuru Belgeleri
              </h2>
            </div>
            <FileField
              id="identity_front"
              label="Kimliğinizin Ön Yüzünü Yükleyin"
              description="JPEG, PNG veya WebP · en fazla 4 MB"
              file={files.identity_front}
              error={errors.identity_front}
              onChange={(file, message) => {
                setFiles((current) => ({ ...current, identity_front: file }));
                setErrors((current) => ({
                  ...current,
                  identity_front: message || "",
                }));
              }}
            />
            <FileField
              id="identity_back"
              label="Kimliğinizin Arka Yüzünü Yükleyin"
              description="JPEG, PNG veya WebP · en fazla 4 MB"
              file={files.identity_back}
              error={errors.identity_back}
              onChange={(file, message) => {
                setFiles((current) => ({ ...current, identity_back: file }));
                setErrors((current) => ({
                  ...current,
                  identity_back: message || "",
                }));
              }}
            />
            <FileField
              id="residence"
              label="e-Devlet'ten Alınmış İkametgâh Belgesi"
              description="e-Devlet üzerinden alınmış güncel ikametgâh belgenizi PDF veya görsel olarak yükleyebilirsiniz. En fazla 4 MB."
              file={files.residence}
              error={errors.residence}
              residence
              onChange={(file, message) => {
                setFiles((current) => ({ ...current, residence: file }));
                setErrors((current) => ({
                  ...current,
                  residence: message || "",
                }));
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-lg font-black text-zinc-950">İmza</h2>
            <p className="mb-4 mt-1 text-sm leading-6 text-zinc-500">
              Lütfen aşağıdaki alana parmağınızla imzanızı atınız.
            </p>
            <SignaturePad
              onChange={(value) => {
                setSignature(value);
                if (value)
                  setErrors((current) => ({ ...current, signature: "" }));
              }}
              error={errors.signature}
            />
          </CardContent>
        </Card>

        {!reviewing ? (
          <Button
            size="lg"
            className="w-full"
            disabled={!contract || !paymentPlan}
            onClick={openReview}
          >
            <FileCheck2 className="size-5" aria-hidden="true" />
            Bilgileri Kontrol Et
          </Button>
        ) : (
          <Card id="application-review" className="border-zinc-900">
            <CardContent className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-zinc-950">
                  Son Kontrol ve Bilgilendirme
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Seçtiğiniz ürün, iletişim bilgileriniz, üç belge ve imzanız
                  gönderilecektir.
                </p>
              </div>
              {signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signature.previewUrl}
                  alt="İmza önizlemesi"
                  className="h-24 w-full rounded-lg border border-zinc-200 bg-white object-contain"
                />
              ) : null}
              <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-bold">
                  Bu işlem bir elden taksit başvurusudur.
                </p>
                <p>
                  Gönderim otomatik onay, satış veya sipariş oluşturmaz. Başvuru
                  CENTER GSM tarafından değerlendirilir; sonuç onay veya ret
                  olabilir.
                </p>
              </div>
              <label className="flex items-start gap-3 text-sm leading-6 text-zinc-700">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-red-600"
                  checked={termsAcknowledged}
                  onChange={(event) =>
                    setTermsAcknowledged(event.target.checked)
                  }
                />
                <span>
                  Başvurunun otomatik onay veya sipariş oluşturmadığını ve
                  CENTER GSM tarafından değerlendirileceğini anladım.
                </span>
              </label>
              {errors.terms ? (
                <p className="text-sm font-semibold text-red-700">
                  {errors.terms}
                </p>
              ) : null}
              <label className="flex items-start gap-3 text-sm leading-6 text-zinc-700">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-red-600"
                  checked={privacyAcknowledged}
                  onChange={(event) =>
                    setPrivacyAcknowledged(event.target.checked)
                  }
                />
                <span>
                  <Link
                    href="/kvkk"
                    target="_blank"
                    className="font-bold text-red-700 underline underline-offset-2"
                  >
                    KVKK Aydınlatma Metni
                  </Link>
                  &apos;ni okudum ve kişisel verilerimin başvuru değerlendirme
                  amacıyla işlenmesi hakkında bilgi edindim.
                </span>
              </label>
              {errors.privacy ? (
                <p className="text-sm font-semibold text-red-700">
                  {errors.privacy}
                </p>
              ) : null}
              <p className="text-xs leading-5 text-zinc-500">
                Bu beyan açık rıza veya pazarlama izni değildir. Başvuru
                kapsamında pazarlama izni talep edilmez.
              </p>
              {errors.submit ? (
                <p
                  className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {errors.submit}
                </p>
              ) : null}
              {busy ? (
                <div className="space-y-2" role="status" aria-live="polite">
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full bg-red-600 transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs font-semibold text-zinc-600">
                    Belgeler güvenli alana aktarılıyor · %{progress}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setReviewing(false)}
                >
                  Bilgileri Düzenle
                </Button>
                <Button
                  size="lg"
                  disabled={
                    busy ||
                    !contractAcknowledged ||
                    !selectedPaymentPlan ||
                    !termsAcknowledged ||
                    !privacyAcknowledged
                  }
                  onClick={submit}
                >
                  {busy ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <FileSignature className="size-5" />
                  )}
                  BAŞVURUYU GÖNDER
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-24">
        <Card>
          <CardContent className="flex gap-3">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold">Private belge alanı</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Belgeler public ürün görsellerinden ayrı tutulur.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-bold">Otomatik satış yok</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Başvuru stok düşürmez, ödeme başlatmaz ve sipariş oluşturmaz.
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
      {contract ? (
        <InstallmentContractModal
          open={contractOpen}
          title={contract.title}
          renderedContent={renderedContract}
          onClose={() => setContractOpen(false)}
        />
      ) : null}
    </div>
  );
}
