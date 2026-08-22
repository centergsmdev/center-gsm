"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Link2,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ScrollText,
  XCircle,
} from "lucide-react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { AdminModal } from "@/components/admin/admin-modal";
import {
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  INSTALLMENT_DOCUMENT_LABELS,
  INSTALLMENT_PORTAL_STAGES,
  INSTALLMENT_PORTAL_STAGE_LABELS,
  INSTALLMENT_STATUS_LABELS,
  type InstallmentAdminDetail,
  type InstallmentPortalStage,
} from "@/lib/installment/types";
import { PaymentPlanSummary } from "@/components/installment/payment-plan-summary";
import { PortalCopyButton } from "@/components/installment/portal-copy-button";
import {
  formatMinorCurrency,
  type PaymentPlan,
} from "@/lib/payment-plan/engine";

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard>
      <AdminCardHeader title={title} />
      <div className="p-5 sm:p-6">{children}</div>
    </AdminCard>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold text-zinc-900">
        {value || "—"}
      </dd>
    </div>
  );
}

export function AdminInstallmentApplicationDetail({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [item, setItem] = useState<InstallmentAdminDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [publicReason, setPublicReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [contractOpen, setContractOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentDueAt, setPaymentDueAt] = useState("");
  const [portalStage, setPortalStage] =
    useState<InstallmentPortalStage>("down_payment_pending");
  const [portalPublicNote, setPortalPublicNote] = useState("");
  const [portalNotice, setPortalNotice] = useState("");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const response = await fetch(
        `/api/admin/installment-applications/${applicationId}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("load_failed");
      const payload = (await response.json()) as {
        item: InstallmentAdminDetail;
      };
      setItem(payload.item);
      setPublicReason(payload.item.rejectionReasonPublic ?? "");
      setInternalNote(payload.item.internalNote ?? "");
      setPaymentAccountId(
        payload.item.customerPortal?.paymentAccount.id ??
          payload.item.paymentAccounts.find((account) => account.isDefault)
            ?.id ??
          payload.item.paymentAccounts[0]?.id ??
          "",
      );
      setPaymentDueAt(
        payload.item.customerPortal?.paymentDueAt
          ? toLocalDateTime(payload.item.customerPortal.paymentDueAt)
          : "",
      );
      setPortalStage(
        payload.item.customerPortal?.stage ?? "down_payment_pending",
      );
      setPortalPublicNote(payload.item.customerPortal?.publicNote ?? "");
    } catch {
      setFailed(true);
    }
  }, [applicationId]);

  useEffect(() => void load(), [load]);

  async function transition(action: "review" | "approve" | "reject") {
    if (!item) return;
    if (
      action === "approve" &&
      !window.confirm(
        item.paymentPlan
          ? `Bu başvuruyu ${item.paymentPlan.installmentCount} ay ve ${formatMinorCurrency(item.paymentPlan.totalPayableMinor)} toplam ödeme planıyla onaylamak istediğinize emin misiniz? Ödeme planı değiştirilmeyecektir.`
          : "Bu legacy başvuruda ödeme planı snapshot'ı yok. Başvuruyu yine de onaylamak istediğinize emin misiniz?",
      )
    )
      return;
    if (action === "reject" && publicReason.trim().length < 3) {
      setMessage("Müşteriye gösterilecek ret nedenini girin.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/installment-applications/${applicationId}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            revision: item.revision,
            publicReason,
            internalNote,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Karar kaydedilemedi.");
      await load();
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Karar kaydedilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function portalAction(
    action: "configure" | "update_stage" | "renew",
  ) {
    if (!item) return;
    setBusy(true);
    setMessage("");
    setPortalNotice("");
    try {
      const body: Record<string, unknown> = { action };
      if (action === "configure") {
        body.paymentAccountId = paymentAccountId;
        body.paymentDueAt = paymentDueAt
          ? new Date(paymentDueAt).toISOString()
          : null;
      }
      if (action === "update_stage") {
        body.stage = portalStage;
        body.publicNote = portalPublicNote;
      }
      const response = await fetch(
        `/api/admin/installment-applications/${applicationId}/portal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Müşteri sayfası güncellenemedi.");
      setPortalNotice(
        action === "update_stage"
          ? "Müşterinin göreceği işlem aşaması güncellendi."
          : action === "renew"
            ? "Güvenli bağlantı 30 gün süreyle yenilendi."
            : item.customerPortal
              ? "Ödeme bilgileri ve güvenli bağlantı güncellendi."
              : "Müşteriye özel başvuru sayfası hazırlandı.",
      );
      await load();
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Müşteri sayfası güncellenemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (failed) return <AdminErrorState retry={() => void load()} />;
  if (!item) return <AdminLoadingState />;
  const whatsappUrl =
    item.portalHandoff.state === "ready" ? item.portalHandoff.url : null;
  const signature = item.documents.find(
    (document) => document.type === "signature",
  );
  const documents = item.documents.filter(
    (document) => document.type !== "signature",
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/elden-taksit-basvurulari")}
        >
          <ArrowLeft className="size-4" /> Başvurulara Dön
        </Button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold">
            {item.applicationNumber}
          </span>
          <AdminBadge
            variant={
              item.status === "approved"
                ? "success"
                : item.status === "rejected"
                  ? "danger"
                  : item.status === "under_review"
                    ? "info"
                    : "warning"
            }
          >
            {INSTALLMENT_STATUS_LABELS[item.status]}
          </AdminBadge>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DetailBlock title="Müşteri">
          <dl>
            <DataRow label="Ad Soyad" value={item.applicantName} />
            <DataRow label="Telefon" value={item.phone} />
            <DataRow label="E-posta" value={item.email} />
          </dl>
        </DetailBlock>
        <DetailBlock title="Ürün">
          <div className="flex flex-col gap-4 sm:flex-row">
            {item.imageUrl ? (
              // Dynamic Supabase host is intentionally rendered directly.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.productName}
                className="size-28 rounded-xl bg-zinc-50 object-contain p-2"
              />
            ) : null}
            <dl className="min-w-0 flex-1">
              <DataRow label="Ürün" value={item.productName} />
              <DataRow label="Varyant" value={item.variantTitle} />
              <DataRow label="Renk" value={item.color} />
              <DataRow
                label="Depolama"
                value={
                  item.storageValue && item.storageUnit
                    ? `${item.storageValue} ${item.storageUnit}`
                    : null
                }
              />
              <DataRow label="SKU" value={item.sku} />
              <DataRow
                label="Başvuru Fiyatı"
                value={formatCurrency(item.price)}
              />
            </dl>
          </div>
        </DetailBlock>
      </div>

      <DetailBlock title="Belgeler">
        <div className="grid gap-3 sm:grid-cols-3">
          {documents.map((document) => {
            const base = `/api/admin/installment-applications/${item.id}/documents/${document.id}`;
            return (
              <div
                key={document.id}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <FileText className="size-6 text-zinc-600" />
                <p className="mt-3 text-sm font-bold">
                  {INSTALLMENT_DOCUMENT_LABELS[document.type]}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {document.originalName}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(base, "_blank", "noopener,noreferrer")
                    }
                  >
                    <Eye className="size-4" /> Görüntüle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      window.open(
                        `${base}?download=1`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    aria-label={`${INSTALLMENT_DOCUMENT_LABELS[document.type]} indir`}
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DetailBlock>

      <DetailBlock title="Müşteri İmzası">
        {signature ? (
          // Signature is served by an authenticated, audited admin route.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/admin/installment-applications/${item.id}/documents/${signature.id}`}
            alt="Müşteri imzası"
            className="h-52 w-full rounded-xl border border-zinc-200 bg-white object-contain"
          />
        ) : (
          <p className="text-sm text-red-700">İmza belgesi bulunamadı.</p>
        )}
      </DetailBlock>

      <DetailBlock title="Sözleşme">
        {item.contract ? (
          <div className="space-y-4">
            <dl>
              <DataRow label="Sözleşme Adı" value={item.contract.title} />
              <DataRow label="Versiyon" value={item.contract.version} />
              <DataRow
                label="Kabul Tarihi"
                value={new Intl.DateTimeFormat("tr-TR", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(item.contract.acceptedAt))}
              />
              <DataRow
                label="SHA-256"
                value={
                  <span className="font-mono">
                    {item.contract.contentHash.slice(0, 12)}…
                  </span>
                }
              />
            </dl>
            <Button variant="outline" onClick={() => setContractOpen(true)}>
              <ScrollText className="size-4" /> İmzalanan Sözleşmeyi Gör
            </Button>
          </div>
        ) : (
          <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
            Bu başvuru sözleşme snapshot özelliğinden önce oluşturulmuş legacy
            kayıttır; sözleşme kabulü üretilmemiştir.
          </p>
        )}
      </DetailBlock>

      <DetailBlock title="Ödeme Planı">
        {item.paymentPlan ? (
          <PaymentPlanSummary
            title="Müşterinin Kabul Ettiği Ödeme Planı"
            plan={
              {
                paymentType: "installment_application",
                ...item.paymentPlan,
                monthlyInstallmentMinor:
                  item.paymentPlan.installmentSchedule[0]?.amountMinor ?? 0,
              } satisfies PaymentPlan
            }
          />
        ) : (
          <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
            Bu başvuru ödeme planı snapshot özelliğinden önce oluşturulmuş
            legacy kayıttır; geriye dönük plan üretilmemiştir.
          </p>
        )}
      </DetailBlock>

      {item.status === "approved" ? (
        <DetailBlock title="Müşteriye Özel Başvuru Sayfası">
          {item.portalHandoff.state === "missing_payment_plan" ? (
            <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
              Bu başvuruda kayıtlı ödeme planı bulunmadığı için müşteri sayfası
              oluşturulamıyor.
            </p>
          ) : !item.paymentAccounts.length ? (
            <div className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p className="font-bold">Aktif ödeme hesabı bulunmuyor.</p>
              <p>
                Önce Ödeme Ayarları bölümünden müşteriye gösterilecek banka ve
                IBAN bilgilerini ekleyin.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/admin/odeme-ayarlari")}
              >
                Ödeme Ayarlarına Git
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-zinc-600">
                Müşteriye ürününü, değiştirilemez ödeme planını, peşinat
                tutarını, ödeme hesabını ve işlemin güncel aşamasını gösteren
                güvenli bir sayfa hazırlayın.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-zinc-800">
                  Gösterilecek ödeme hesabı
                  <select
                    value={paymentAccountId}
                    onChange={(event) =>
                      setPaymentAccountId(event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-red-600"
                  >
                    {item.paymentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName} · {account.iban.slice(-6)}
                        {account.isDefault ? " · Varsayılan" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-bold text-zinc-800">
                  Peşinat son ödeme zamanı{" "}
                  <span className="font-normal text-zinc-500">
                    (isteğe bağlı)
                  </span>
                  <input
                    type="datetime-local"
                    value={paymentDueAt}
                    onChange={(event) => setPaymentDueAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-red-600"
                  />
                </label>
              </div>
              <Button
                disabled={busy || !paymentAccountId}
                onClick={() => void portalAction("configure")}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
                {item.customerPortal
                  ? "Ödeme Bilgilerini ve Linki Güncelle"
                  : "Müşteri Sayfasını Hazırla"}
              </Button>
              {item.customerPortal ? (
                <>
                  <div className="border-t border-zinc-100 pt-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-bold text-zinc-800">
                        Müşterinin göreceği aşama
                        <select
                          value={portalStage}
                          onChange={(event) =>
                            setPortalStage(
                              event.target.value as InstallmentPortalStage,
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-red-600"
                        >
                          {INSTALLMENT_PORTAL_STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                              {INSTALLMENT_PORTAL_STAGE_LABELS[stage]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-bold text-zinc-800">
                        Müşteriye gösterilecek not
                        <textarea
                          value={portalPublicNote}
                          onChange={(event) =>
                            setPortalPublicNote(event.target.value)
                          }
                          maxLength={600}
                          placeholder="Örn. Ödemeniz kontrol ediliyor."
                          className="mt-2 min-h-24 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm font-normal outline-none focus:border-red-600"
                        />
                      </label>
                    </div>
                    <Button
                      className="mt-3"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void portalAction("update_stage")}
                    >
                      Güncel Aşamayı Kaydet
                    </Button>
                  </div>
                  {item.portalHandoff.state === "ready" ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-bold text-emerald-900">
                        Güvenli müşteri bağlantısı hazır
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800">
                        Son geçerlilik:{" "}
                        {formatAdminDateTime(
                          item.customerPortal.accessExpiresAt,
                        )}
                      </p>
                      <p className="mt-3 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-zinc-700">
                        {item.portalHandoff.accessUrl}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => setWhatsappOpen(true)}
                        >
                          <MessageCircle className="size-4" /> WhatsApp&apos;tan
                          Kişisel Linki Gönder
                        </Button>
                        <PortalCopyButton
                          value={item.portalHandoff.accessUrl}
                          label="Linki Kopyala"
                        />
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void portalAction("renew")}
                        >
                          <RefreshCw className="size-4" /> Linki Yenile
                        </Button>
                      </div>
                    </div>
                  ) : item.portalHandoff.state === "expired" ? (
                    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-bold">
                        Müşteri bağlantısının süresi doldu.
                      </p>
                      <Button
                        className="mt-3"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void portalAction("renew")}
                      >
                        <RefreshCw className="size-4" /> 30 Gün Yenile
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
              {portalNotice ? (
                <p
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
                >
                  {portalNotice}
                </p>
              ) : null}
            </div>
          )}
        </DetailBlock>
      ) : null}

      <DetailBlock title="Başvuru ve Karar">
        <dl className="mb-5">
          <DataRow label="Başvuru No" value={item.applicationNumber} />
          <DataRow
            label="Gönderim"
            value={new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "long",
              timeStyle: "short",
            }).format(new Date(item.submittedAt ?? item.createdAt))}
          />
          <DataRow label="Revizyon" value={item.revision} />
          <DataRow
            label="Retention İncelemesi"
            value={new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "long",
            }).format(new Date(item.retentionReviewAt))}
          />
        </dl>
        {item.status === "submitted" ? (
          <Button disabled={busy} onClick={() => void transition("review")}>
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Eye className="size-4" />
            )}{" "}
            İncelemeyi Başlat
          </Button>
        ) : null}
        {item.status === "under_review" ? (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-zinc-800">
              Müşteriye Gösterilecek Ret Nedeni
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-zinc-300 p-3 text-sm font-normal outline-none focus:border-red-600"
                value={publicReason}
                onChange={(event) => setPublicReason(event.target.value)}
                maxLength={1000}
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Admin İç Notu{" "}
              <span className="font-normal text-zinc-500">
                (müşteriye gösterilmez)
              </span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-zinc-300 p-3 text-sm font-normal outline-none focus:border-red-600"
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                maxLength={2000}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={busy}
                onClick={() => void transition("approve")}
              >
                <CheckCircle2 className="size-4" /> BAŞVURUYU ONAYLA
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => void transition("reject")}
              >
                <XCircle className="size-4" /> BAŞVURUYU REDDET
              </Button>
            </div>
          </div>
        ) : null}
        {item.status === "approved" || item.status === "rejected" ? (
          <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-bold">Karar kesinleştirildi.</p>
            <p className="mt-1">
              Bu ekranda sessiz durum değişikliği veya ikinci karar işlemi
              yapılmaz.
            </p>
            {item.rejectionReasonPublic ? (
              <p className="mt-3">
                <strong>Ret nedeni:</strong> {item.rejectionReasonPublic}
              </p>
            ) : null}
            {item.internalNote ? (
              <p className="mt-2">
                <strong>Admin iç notu:</strong> {item.internalNote}
              </p>
            ) : null}
          </div>
        ) : null}
        {message ? (
          <p
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {message}
          </p>
        ) : null}
      </DetailBlock>
      {item.contract ? (
        <AdminModal
          open={contractOpen}
          onClose={() => setContractOpen(false)}
          title={item.contract.title}
          description={`Versiyon ${item.contract.version} · SHA-256 ${item.contract.contentHash.slice(0, 12)}…`}
          wide
        >
          <div
            className="rich-product-content break-words text-sm leading-7 text-zinc-700 sm:text-base sm:leading-8"
            // The admin API sanitizes this immutable snapshot before return.
            dangerouslySetInnerHTML={{
              __html: item.contract.renderedContent,
            }}
          />
        </AdminModal>
      ) : null}
      {item.portalHandoff.state === "ready" && whatsappUrl ? (
        <AdminModal
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          title="Müşteriye Özel Başvuru Linki"
          description="Mesaj müşterinin güvenli takip bağlantısını içerir. Ödeme planı ve banka bilgileri WhatsApp mesajına açık metin olarak eklenmez."
          footer={
            <>
              <Button variant="outline" onClick={() => setWhatsappOpen(false)}>
                İptal
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                  setWhatsappOpen(false);
                }}
              >
                <MessageCircle className="size-4" /> WhatsApp&apos;ta Aç
              </Button>
            </>
          }
        >
          <pre
            aria-label="Hazırlanan kişisel başvuru bağlantısı mesajı"
            className="max-h-[60dvh] w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-4 font-sans text-xs leading-6 text-zinc-800 sm:text-sm"
          >
            {item.portalHandoff.message}
          </pre>
        </AdminModal>
      ) : null}
    </div>
  );
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatAdminDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}
