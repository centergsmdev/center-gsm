"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileCheck2 } from "lucide-react";

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
  getPaymentReceiptUrl,
  type AdminPaymentReceipt,
} from "@/lib/admin/payment-receipts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import {
  ADMIN_ACTIVITY_EVENT,
  markAdminRecordSeen,
  readAdminUnseenRecords,
  type AdminActivityKind,
} from "@/lib/admin/activity-indicator";

export function AdminPaymentReceipts() {
  const [items, setItems] = useState<AdminPaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [unseenIds, setUnseenIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const result = await getAdminPaymentReceipts();
    setItems(result.data ?? []);
    setError(Boolean(result.error));
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

  if (loading) return <AdminLoadingState />;
  if (error) return <AdminErrorState retry={() => void load()} />;

  return (
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
                  {new Date(item.uploaded_at ?? item.created_at).toLocaleString(
                    "tr-TR",
                  )}
                </AdminTd>
                <AdminTd>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={opening === item.id || !item.uploaded_at}
                    onClick={() => void openReceipt(item)}
                  >
                    <ExternalLink className="size-4" />
                    {opening === item.id ? "Açılıyor…" : "Dekontu aç"}
                  </Button>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminCard>
  );
}
