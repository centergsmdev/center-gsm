"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import {
  getShippingSyncJobs,
  retryShippingJob,
} from "@/shipping/repository/gateway-repository";
import type { Tables } from "@/types/database";
export function AdminShippingSyncJobs() {
  const [items, setItems] = useState<Tables<"shipping_sync_jobs">[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const r = await getShippingSyncJobs(page);
    if (r.data) {
      setItems(r.data.items);
      setTotal(r.data.total);
      setError("");
    } else setError(r.error ?? "");
    setLoading(false);
  }, [page]);
  useEffect(() => void load(), [load]);
  return (
    <AdminCard>
      <AdminCardHeader
        title="Kargo senkronizasyonları"
        description="Takip, etiket ve gönderi operasyonlarının güvenli iş kuyruğu."
      />
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Senkronizasyon işi yok"
          description="Gateway operasyonları burada izlenir."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {[
                    "Gönderi",
                    "Provider",
                    "İşlem",
                    "Durum",
                    "Deneme",
                    "Planlanan",
                    "Başlama",
                    "Bitiş",
                    "Son hata",
                    "",
                  ].map((x, i) => (
                    <th key={`${x}-${i}`} className="p-4">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((x) => (
                  <tr key={x.id}>
                    <td className="p-4 font-mono text-xs">
                      {x.shipment_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="p-4 font-bold">{x.provider_key}</td>
                    <td className="p-4">{x.job_type}</td>
                    <td className="p-4">{x.status}</td>
                    <td className="p-4">{x.attempt_count}</td>
                    <td className="whitespace-nowrap p-4">
                      {new Date(x.scheduled_at).toLocaleString("tr-TR")}
                    </td>
                    <td className="p-4">
                      {x.started_at
                        ? new Date(x.started_at).toLocaleString("tr-TR")
                        : "—"}
                    </td>
                    <td className="p-4">
                      {x.completed_at
                        ? new Date(x.completed_at).toLocaleString("tr-TR")
                        : "—"}
                    </td>
                    <td className="p-4 text-xs">{x.last_error ?? "—"}</td>
                    <td className="p-4">
                      {x.status === "failed" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await retryShippingJob(x.id);
                            await load();
                          }}
                        >
                          Tekrar dene
                        </Button>
                      ) : null}
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
