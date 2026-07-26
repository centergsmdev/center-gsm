"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { adminControlClass } from "./admin-form";
import { getShippingWebhooks } from "@/shipping/repository/gateway-repository";
import type { Tables } from "@/types/database";
export function AdminShippingWebhooks() {
  const [items, setItems] = useState<Tables<"shipping_webhooks">[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [provider, setProvider] = useState(""),
    [status, setStatus] = useState(""),
    [signature, setSignature] = useState(""),
    [tracking, setTracking] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const r = await getShippingWebhooks(page, {
      provider,
      status,
      signature,
      tracking,
    });
    if (r.data) {
      setItems(r.data.items);
      setTotal(r.data.total);
      setError("");
    } else setError(r.error ?? "");
    setLoading(false);
  }, [page, provider, status, signature, tracking]);
  useEffect(() => void load(), [load]);
  return (
    <AdminCard>
      <AdminCardHeader
        title="Kargo webhookları"
        description="İmzalı sağlayıcı olaylarını ve idempotent işleme sonuçlarını izleyin."
      />
      <div className="grid gap-2 border-b p-4 sm:grid-cols-4">
        <input
          aria-label="Provider"
          placeholder="Provider"
          value={provider}
          onChange={(e) => {
            setPage(1);
            setProvider(e.target.value);
          }}
          className={adminControlClass}
        />
        <select
          aria-label="Durum"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className={adminControlClass}
        >
          <option value="">Tüm durumlar</option>
          <option value="processed">İşlendi</option>
          <option value="failed">Hatalı</option>
          <option value="received">Alındı</option>
        </select>
        <select
          aria-label="İmza"
          value={signature}
          onChange={(e) => {
            setPage(1);
            setSignature(e.target.value);
          }}
          className={adminControlClass}
        >
          <option value="">Tüm imzalar</option>
          <option value="valid">Geçerli</option>
          <option value="invalid">Geçersiz</option>
        </select>
        <input
          aria-label="Takip numarası"
          placeholder="Takip numarası"
          value={tracking}
          onChange={(e) => {
            setPage(1);
            setTracking(e.target.value);
          }}
          className={adminControlClass}
        />
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Webhook kaydı yok"
          description="Doğrulanan kargo olayları burada listelenecek."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {[
                    "Provider",
                    "Event",
                    "Takip",
                    "Gönderi",
                    "İmza",
                    "Durum",
                    "Retry",
                    "Alındı",
                    "İşlendi",
                    "Özet / Hata",
                  ].map((x) => (
                    <th key={x} className="p-4">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((x) => (
                  <tr key={x.id}>
                    <td className="p-4 font-bold">{x.provider_key}</td>
                    <td className="p-4">{x.event_type}</td>
                    <td className="p-4 font-mono text-xs">
                      {x.tracking_number ?? "—"}
                    </td>
                    <td className="p-4 font-mono text-xs">
                      {x.shipment_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="p-4">
                      {x.signature_valid ? "Geçerli" : "Geçersiz"}
                    </td>
                    <td className="p-4">{x.status}</td>
                    <td className="p-4">{x.retry_count}</td>
                    <td className="whitespace-nowrap p-4">
                      {new Date(x.received_at).toLocaleString("tr-TR")}
                    </td>
                    <td className="whitespace-nowrap p-4">
                      {x.processed_at
                        ? new Date(x.processed_at).toLocaleString("tr-TR")
                        : "—"}
                    </td>
                    <td className="max-w-72 break-words p-4 text-xs">
                      {x.last_error ?? JSON.stringify(x.payload_summary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t p-4">
            <span className="text-sm text-zinc-500">{total} kayıt</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Önceki
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page * 25 >= total}
                onClick={() => setPage((v) => v + 1)}
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
