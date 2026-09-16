"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Trash2,
  XCircle,
} from "lucide-react";

import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import {
  getAdminPaymentReceipts,
  getAdminInstallmentPaymentReceipts,
  deleteAdminInstallmentPaymentReceipt,
  deleteAdminPaymentReceipt,
  getPaymentReceiptUrl,
  reviewAdminInstallmentPaymentReceipt,
  type AdminInstallmentPaymentReceipt,
  type AdminPaymentReceipt,
} from "@/lib/admin/payment-receipts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import { formatMinorCurrency } from "@/lib/payment-plan/engine";
import {
  ADMIN_ACTIVITY_EVENT,
  markAdminRecordSeen,
  readAdminUnseenRecords,
  type AdminActivityKind,
} from "@/lib/admin/activity-indicator";

export function AdminPaymentReceipts() {
  const [items, setItems] = useState<AdminPaymentReceipt[]>([]);
  const [installmentItems, setInstallmentItems] = useState<
    AdminInstallmentPaymentReceipt[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unseenIds, setUnseenIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [result, installmentResult] = await Promise.all([
      getAdminPaymentReceipts(),
      getAdminInstallmentPaymentReceipts(),
    ]);
    setItems(result.data ?? []);
    setInstallmentItems(installmentResult.data ?? []);
    setError(Boolean(result.error || installmentResult.error));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const client = createClient();
    if (!client) return;
    const channel = client
      .channel("admin-payment-receipts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_receipts" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "installment_payment_receipts",
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    setUnseenIds(new Set(readAdminUnseenRecords().receipt));

    function handleActivity(event: Event) {
      const detail = (
        event as CustomEvent<{
          kind: AdminActivityKind;
          entityId?: string;
        }>
      ).detail;
      if (detail.kind !== "receipt" || !detail.entityId) return;
      setUnseenIds((current) => new Set([detail.entityId!, ...current]));
    }

    window.addEventListener(ADMIN_ACTIVITY_EVENT, handleActivity);
    return () =>
      window.removeEventListener(ADMIN_ACTIVITY_EVENT, handleActivity);
  }, []);

  async function openReceipt(item: AdminPaymentReceipt) {
    markAdminRecordSeen("receipt", item.id);
    setUnseenIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    setOpening(item.id);
    const result = await getPaymentReceiptUrl(item.storage_path);
    setOpening(null);
    if (result.data) window.open(result.data, "_blank", "noopener,noreferrer");
  }

  async function openInstallmentReceipt(item: AdminInstallmentPaymentReceipt) {
    markAdminRecordSeen("receipt", item.id);
    setUnseenIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    setOpening(item.id);
    const result = await getPaymentReceiptUrl(item.storage_path);
    setOpening(null);
    if (result.data) window.open(result.data, "_blank", "noopener,noreferrer");
    else setNotice(result.error);
  }

  async function reviewReceipt(
    item: AdminInstallmentPaymentReceipt,
    status: "approved" | "rejected",
  ) {
    let rejectionReason: string | undefined;
    if (status === "approved") {
      if (
        !window.confirm(
          `${item.applicationNumber} başvurusunun peşinat ödemesini onaylıyor musunuz?`,
        )
      )
        return;
    } else {
      const entered = window.prompt(
        "Müşteriye gösterilecek ret nedenini yazın:",
        "Dekont veya ödeme bilgileri doğrulanamadı. Lütfen doğru dekontu yeniden yükleyin.",
      );
      if (entered === null) return;
      rejectionReason = entered.trim();
      if (rejectionReason.length < 3) {
        setNotice("Ret nedenini en az 3 karakter olarak yazın.");
        return;
      }
    }
    setReviewing(item.id);
    setNotice(null);
    const result = await reviewAdminInstallmentPaymentReceipt(
      item.id,
      status,
      rejectionReason,
    );
    setReviewing(null);
    if (result.error) return setNotice(result.error);
    setNotice(
      status === "approved"
        ? "Peşinat ödemesi onaylandı. Müşteri ekranı güncellendi."
        : "Dekont reddedildi. Müşteri yeni dekont yükleyebilir.",
    );
    await load();
  }

  async function removeReceipt(
    item: AdminPaymentReceipt | AdminInstallmentPaymentReceipt,
    type: "transfer" | "installment",
  ) {
    const confirmation = window.prompt(
      `Dekontu kalıcı olarak silmek için dosya adını yazın: ${item.original_name}`,
    );
    if (confirmation !== item.original_name) {
      if (confirmation !== null) setNotice("Dosya adı eşleşmedi.");
      return;
    }
    if (
      !window.confirm(
        "Dekont kaydı ve yüklenen özel dosya kalıcı olarak silinecek. Devam edilsin mi?",
      )
    )
      return;
    setDeleting(item.id);
    setNotice(null);
    const result =
      type === "installment"
        ? await deleteAdminInstallmentPaymentReceipt(item.id)
        : await deleteAdminPaymentReceipt(item.id);
    setDeleting(null);
    if (!result.data) {
      setNotice(result.error ?? "Dekont silinemedi.");
      return;
    }
    setNotice(result.data.warning || "Dekont kalıcı olarak silindi.");
    await load();
  }

  if (loading) return <AdminLoadingState />;
  if (error) return <AdminErrorState retry={() => void load()} />;

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm">
          {notice}
        </div>
      ) : null}

      <AdminCard>
        <AdminCardHeader
          title="Elden Taksit Peşinat Dekontları"
          description="Müşteri portalından yüklenen dekontları anlık inceleyin ve ödeme kararını verin."
        />
        {!installmentItems.length ? (
          <AdminEmptyState
            title="Henüz elden taksit dekontu yok"
            description="Müşteri kişisel başvuru sayfasından dekont yüklediğinde burada anında görünecek."
          />
        ) : (
          <AdminTable label="Elden taksit peşinat dekontları">
            <thead>
              <tr>
                <AdminTh>Başvuru</AdminTh>
                <AdminTh>Müşteri / Ürün</AdminTh>
                <AdminTh>Peşinat</AdminTh>
                <AdminTh>Durum</AdminTh>
                <AdminTh>Yüklenme</AdminTh>
                <AdminTh>İşlem</AdminTh>
              </tr>
            </thead>
            <tbody>
              {installmentItems.map((item) => (
                <tr
                  key={item.id}
                  className={
                    unseenIds.has(item.id)
                      ? "bg-emerald-50 hover:bg-emerald-100"
                      : item.superseded_at
                        ? "bg-zinc-50/70 hover:bg-zinc-100"
                        : "hover:bg-zinc-50"
                  }
                >
                  <AdminTd>
                    <p className="font-black">{item.applicationNumber}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.original_name}
                    </p>
                  </AdminTd>
                  <AdminTd>
                    <p className="font-bold">{item.customerName}</p>
                    <p className="mt-1 max-w-64 text-xs text-zinc-500">
                      {item.productName}
                    </p>
                  </AdminTd>
                  <AdminTd className="font-black">
                    {formatMinorCurrency(item.amount_minor)}
                  </AdminTd>
                  <AdminTd>
                    <ReceiptStatus
                      status={item.status}
                      previous={Boolean(item.superseded_at)}
                    />
                    {item.rejection_reason_public ? (
                      <p className="mt-2 max-w-56 text-xs leading-5 text-red-700">
                        {item.rejection_reason_public}
                      </p>
                    ) : null}
                  </AdminTd>
                  <AdminTd>
                    {new Date(item.uploaded_at).toLocaleString("tr-TR")}
                  </AdminTd>
                  <AdminTd>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={opening === item.id}
                        onClick={() => void openInstallmentReceipt(item)}
                      >
                        <ExternalLink className="size-4" />
                        {opening === item.id ? "Açılıyor…" : "Dekontu aç"}
                      </Button>
                      {item.status === "pending_review" &&
                      !item.superseded_at ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={reviewing === item.id}
                            onClick={() => void reviewReceipt(item, "approved")}
                          >
                            <CheckCircle2 className="size-4" /> Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            disabled={reviewing === item.id}
                            onClick={() => void reviewReceipt(item, "rejected")}
                          >
                            <XCircle className="size-4" /> Reddet
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={deleting !== null}
                        onClick={() => void removeReceipt(item, "installment")}
                      >
                        <Trash2 className="size-4" />
                        {deleting === item.id ? "Siliniyor…" : "Sil"}
                      </Button>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Havale / EFT Dekontları"
          description="Müşterilerin siparişleri için yüklediği özel dekont dosyaları."
        />
        {!items.length ? (
          <AdminEmptyState
            title="Henüz dekont yok"
            description="Müşteri dekont yüklediğinde bu liste anlık olarak güncellenecek."
          />
        ) : (
          <AdminTable label="Havale ve EFT dekontları">
            <thead>
              <tr>
                <AdminTh>Sipariş</AdminTh>
                <AdminTh>Müşteri</AdminTh>
                <AdminTh>Dosya</AdminTh>
                <AdminTh>Tutar</AdminTh>
                <AdminTh>Yüklenme</AdminTh>
                <AdminTh>İşlem</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={
                    unseenIds.has(item.id)
                      ? "bg-emerald-50 hover:bg-emerald-100"
                      : "hover:bg-zinc-50"
                  }
                >
                  <AdminTd className="font-black">{item.orderNumber}</AdminTd>
                  <AdminTd>{item.customerName}</AdminTd>
                  <AdminTd>
                    <span className="flex items-center gap-2 font-semibold">
                      <FileCheck2 className="size-4 text-emerald-600" />
                      {item.original_name}
                    </span>
                  </AdminTd>
                  <AdminTd>{formatCurrency(item.total)}</AdminTd>
                  <AdminTd>
                    {new Date(
                      item.uploaded_at ?? item.created_at,
                    ).toLocaleString("tr-TR")}
                  </AdminTd>
                  <AdminTd>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={opening === item.id || !item.uploaded_at}
                        onClick={() => void openReceipt(item)}
                      >
                        <ExternalLink className="size-4" />
                        {opening === item.id ? "Açılıyor…" : "Dekontu aç"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={deleting !== null}
                        onClick={() => void removeReceipt(item, "transfer")}
                      >
                        <Trash2 className="size-4" />
                        {deleting === item.id ? "Siliniyor…" : "Sil"}
                      </Button>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}

function ReceiptStatus({
  status,
  previous,
}: {
  status: AdminInstallmentPaymentReceipt["status"];
  previous: boolean;
}) {
  const labels = {
    pending_review: "İnceleniyor",
    approved: "Onaylandı",
    rejected: "Reddedildi",
  };
  const colors = {
    pending_review: "bg-amber-50 text-amber-800",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };
  const label = previous ? `Önceki dekont · ${labels[status]}` : labels[status];
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        previous ? "bg-zinc-200 text-zinc-700" : colors[status]
      }`}
    >
      {label}
    </span>
  );
}
