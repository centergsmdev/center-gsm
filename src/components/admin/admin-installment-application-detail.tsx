"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  LoaderCircle,
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
  INSTALLMENT_STATUS_LABELS,
  type InstallmentAdminDetail,
} from "@/lib/installment/types";
import { PaymentPlanSummary } from "@/components/installment/payment-plan-summary";
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

  if (failed) return <AdminErrorState retry={() => void load()} />;
  if (!item) return <AdminLoadingState />;
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
    </div>
  );
}
