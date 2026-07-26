"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { getPaymentProviders, getPaymentWebhooks } from "@/lib/payments";
import type { PaymentProviderRow, PaymentWebhookRow } from "@/lib/payments";

export function AdminPaymentWebhooks() {
  const [items, setItems] = useState<PaymentWebhookRow[]>([]);
  const [providers, setProviders] = useState<PaymentProviderRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [webhooks, providerResult] = await Promise.all([
      getPaymentWebhooks(page),
      getPaymentProviders(),
    ]);
    if (webhooks.data) {
      setItems(webhooks.data.items);
      setTotal(webhooks.data.total);
      setProviders(providerResult.data ?? []);
      setError("");
    } else setError(webhooks.error ?? "Webhook kayıtları yüklenemedi.");
    setLoading(false);
  }, [page]);

  useEffect(() => void load(), [load]);
  const names = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider.name])),
    [providers],
  );

  return (
    <AdminCard>
      <AdminCardHeader
        title="Ödeme webhookları"
        description="İmzalı sağlayıcı olaylarını, işleme durumlarını ve tekrar denemeleri izleyin."
      />
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Webhook kaydı yok"
          description="Doğrulanan sağlayıcı olayları burada listelenecek."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="p-4">Sağlayıcı</th>
                  <th className="p-4">Olay</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Alındı</th>
                  <th className="p-4">İşlendi</th>
                  <th className="p-4">Tekrar</th>
                  <th className="p-4">Özet / Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-zinc-50/70">
                    <td className="p-4 font-semibold">
                      {names.get(item.provider_id) ?? "Bilinmeyen"}
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{item.event_type}</p>
                      <p className="mt-1 max-w-48 truncate font-mono text-xs text-zinc-500">
                        {item.external_event_id}
                      </p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "processed" ? "bg-emerald-50 text-emerald-700" : item.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-4">
                      {new Date(item.received_at).toLocaleString("tr-TR")}
                    </td>
                    <td className="whitespace-nowrap p-4">
                      {item.processed_at
                        ? new Date(item.processed_at).toLocaleString("tr-TR")
                        : "—"}
                    </td>
                    <td className="p-4">{item.retry_count}</td>
                    <td className="p-4">
                      <p className="max-w-72 break-words text-xs text-zinc-600">
                        {item.last_error ??
                          JSON.stringify(item.payload_summary)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t p-4 text-sm text-zinc-500">
            <span>{total} kayıt</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Önceki
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page * 25 >= total}
                onClick={() => setPage((value) => value + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminCard>
  );
}
