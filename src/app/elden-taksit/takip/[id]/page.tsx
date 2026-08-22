import { cookies } from "next/headers";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";

import { PortalPaymentAccount } from "@/components/installment/portal-payment-account";
import { Container } from "@/components/ui/container";
import { portalAccessCookieName } from "@/lib/installment/customer-portal-security";
import { getCustomerPortalData } from "@/lib/installment/customer-portal-server";
import {
  INSTALLMENT_PORTAL_STAGE_LABELS,
  type InstallmentPortalStage,
} from "@/lib/installment/types";
import {
  formatBasisPoints,
  formatMinorCurrency,
} from "@/lib/payment-plan/engine";
import { isUuid } from "@/lib/installment/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROGRESS: Record<InstallmentPortalStage, number> = {
  down_payment_pending: 2,
  payment_under_review: 2,
  payment_confirmed: 3,
  preparing_delivery: 4,
  completed: 5,
  cancelled: 0,
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = isUuid(id)
    ? (cookieStore.get(portalAccessCookieName(id))?.value ?? null)
    : null;
  const data = isUuid(id) ? await getCustomerPortalData(id, token) : null;
  if (!data)
    return (
      <main className="min-h-[65dvh] bg-zinc-50 py-12 sm:py-20">
        <Container>
          <section className="mx-auto max-w-xl rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm sm:p-10">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
              <ShieldCheck className="size-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-black text-zinc-950">
              Güvenli bağlantı gerekli
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
              Bu müşteri sayfasına erişim bağlantısı geçersiz, yenilenmiş veya
              süresi dolmuş olabilir. Lütfen CENTER GSM tarafından size
              gönderilen son bağlantıyı kullanın.
            </p>
          </section>
        </Container>
      </main>
    );

  const plan = data.paymentPlan;
  const productTitle = data.variantTitle || data.productName;
  return (
    <main className="min-h-screen bg-zinc-50 py-6 sm:py-10">
      <Container>
        <div className="mx-auto max-w-5xl space-y-5">
          <section className="overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-xl">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                  Kişisel Başvuru Sayfanız
                </p>
                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
                  Merhaba {data.applicantName}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                  Ürününüzü, değiştirilemez ödeme planınızı ve işleminizin
                  güncel aşamasını bu sayfadan takip edebilirsiniz.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
                <p className="text-xs text-zinc-400">Başvuru numarası</p>
                <p className="mt-1 font-mono text-sm font-black sm:text-base">
                  {data.applicationNumber}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                  İşleminizin Güncel Aşaması
                </p>
                <h2 className="mt-2 text-xl font-black text-zinc-950 sm:text-2xl">
                  {INSTALLMENT_PORTAL_STAGE_LABELS[data.stage]}
                </h2>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
                  data.stage === "cancelled"
                    ? "bg-red-50 text-red-700"
                    : data.stage === "completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                }`}
              >
                {data.stage === "cancelled" ? (
                  <XCircle className="size-4" />
                ) : (
                  <Clock3 className="size-4" />
                )}
                Güncel durum
              </span>
            </div>
            {data.stage !== "cancelled" ? (
              <PortalProgress stage={data.stage} />
            ) : null}
            {data.publicNote ? (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                <strong>CENTER GSM notu:</strong> {data.publicNote}
              </div>
            ) : null}
            <p className="mt-4 text-xs text-zinc-500">
              Son güncelleme: {formatDateTime(data.updatedAt)}
            </p>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-zinc-100 text-zinc-800">
                  <Smartphone className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                    Talep Edilen Ürün
                  </p>
                  <h2 className="mt-1 font-black text-zinc-950">
                    {productTitle}
                  </h2>
                </div>
              </div>
              <div className="mt-5 flex gap-4">
                {data.imageUrl ? (
                  // Snapshot URL is recorded when the application is submitted.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.imageUrl}
                    alt={productTitle}
                    className="size-28 rounded-2xl bg-zinc-50 object-contain p-2"
                  />
                ) : null}
                <dl className="min-w-0 flex-1 text-sm">
                  <PortalRow label="Ürün" value={data.productName} />
                  <PortalRow label="Varyant" value={data.variantTitle} />
                  <PortalRow label="Renk" value={data.color} />
                  <PortalRow
                    label="Depolama"
                    value={
                      data.storageValue && data.storageUnit
                        ? `${data.storageValue} ${data.storageUnit}`
                        : null
                    }
                  />
                  <PortalRow label="SKU" value={data.sku} />
                </dl>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white">
                  <Banknote className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                    Ödenmesi Gereken İlk Peşinat
                  </p>
                  <p className="mt-1 text-3xl font-black text-zinc-950">
                    {formatMinorCurrency(plan.downPaymentAmountMinor)}
                  </p>
                </div>
              </div>
              {data.paymentDueAt ? (
                <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm font-bold text-zinc-800">
                  Son ödeme zamanı: {formatDateTime(data.paymentDueAt)}
                </p>
              ) : null}
              <p className="mt-4 text-sm leading-6 text-zinc-700">
                Ödeme açıklamasına başvuru numaranızı yazın:
                <strong className="ml-1 font-mono">
                  {data.applicationNumber}
                </strong>
              </p>
            </section>
          </div>

          <PortalPaymentAccount
            initialAccount={data.paymentAccount}
            applicationNumber={data.applicationNumber}
          />

          <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-white text-amber-800 shadow-sm">
                <CreditCard className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-800">
                  Değiştirilemez Ödeme Planınız
                </p>
                <h2 className="mt-1 text-lg font-black text-zinc-950">
                  {plan.installmentCount} Ay Taksit Planı
                </h2>
              </div>
            </div>
            <dl className="mt-5 grid gap-x-6 sm:grid-cols-2">
              <PlanRow label="Ürün fiyatı" value={plan.productPriceMinor} />
              <PlanRow
                label={`Peşinat (%${formatBasisPoints(plan.downPaymentRateBps)})`}
                value={plan.downPaymentAmountMinor}
              />
              <PlanRow
                label="Kalan ana tutar"
                value={plan.remainingPrincipalMinor}
              />
              <PlanRow
                label={`Vade farkı (%${formatBasisPoints(plan.financeChargeRateBps)})`}
                value={plan.financeChargeAmountMinor}
              />
              <PlanRow
                label="Taksitlendirilen tutar"
                value={plan.financedTotalMinor}
              />
              <PlanRow
                label="Toplam ödenecek"
                value={plan.totalPayableMinor}
                strong
              />
            </dl>
            <div className="mt-5 overflow-hidden rounded-2xl border border-amber-200 bg-white">
              <div className="grid grid-cols-[1fr_auto] bg-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-white">
                <span>Taksit</span>
                <span>Tutar</span>
              </div>
              <ol className="divide-y divide-zinc-100">
                {plan.installmentSchedule.map((item) => (
                  <li
                    key={item.installment}
                    className="grid grid-cols-[1fr_auto] items-center px-4 py-3 text-sm"
                  >
                    <span>{item.installment}. taksit</span>
                    <strong>{formatMinorCurrency(item.amountMinor)}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <p className="px-3 pb-4 text-center text-xs leading-5 text-zinc-500">
            Bu sayfa yalnız size gönderilen güvenli bağlantıyla açılır. Kimlik ve
            başvuru belgeleriniz bu ekranda gösterilmez.
          </p>
        </div>
      </Container>
    </main>
  );
}

function PortalProgress({ stage }: { stage: InstallmentPortalStage }) {
  const current = PROGRESS[stage];
  const steps = [
    { label: "Başvuru onaylandı", icon: ShieldCheck },
    {
      label:
        stage === "payment_under_review"
          ? "Peşinat kontrol ediliyor"
          : "Peşinat bekleniyor",
      icon: Banknote,
    },
    { label: "Peşinat onaylandı", icon: CheckCircle2 },
    { label: "Teslimat hazırlanıyor", icon: PackageCheck },
    { label: "İşlem tamamlandı", icon: CheckCircle2 },
  ];
  return (
    <ol className="mt-6 grid gap-3 sm:grid-cols-5">
      {steps.map((step, index) => {
        const number = index + 1;
        const complete = number <= current;
        const active = number === current;
        const Icon = step.icon;
        return (
          <li
            key={step.label}
            className={`rounded-2xl border p-3 ${
              active
                ? "border-amber-300 bg-amber-50"
                : complete
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <Icon
              className={`size-5 ${complete ? "text-emerald-700" : "text-zinc-400"}`}
              aria-hidden="true"
            />
            <p className="mt-2 text-xs font-bold leading-5 text-zinc-800">
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function PortalRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-zinc-100 py-2 last:border-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 break-words font-bold text-zinc-900">
        {value || "—"}
      </dd>
    </div>
  );
}

function PlanRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-amber-100 py-3 text-sm">
      <dt className="text-zinc-600">{label}</dt>
      <dd className={strong ? "font-black text-red-700" : "font-black"}>
        {formatMinorCurrency(value)}
      </dd>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
