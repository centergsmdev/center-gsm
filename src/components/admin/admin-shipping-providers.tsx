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
  getShippingProviderSettings,
  updateShippingProvider,
} from "@/shipping/repository/gateway-repository";
import type { Tables } from "@/types/database";
type Row = Tables<"shipping_provider_settings"> & {
  carrier: Tables<"shipping_carriers"> | null;
};
export function AdminShippingProviders() {
  const [items, setItems] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getShippingProviderSettings();
    if (result.data) {
      setItems(result.data);
      setError("");
    } else setError(result.error ?? "");
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);
  async function update(
    item: Row,
    active: boolean,
    environment: "sandbox" | "production",
  ) {
    const result = await updateShippingProvider(item.id, active, environment);
    if (!result.data) setError(result.error ?? "");
    else {
      setNotice(`${item.carrier?.name ?? item.provider_key} güncellendi.`);
      await load();
    }
  }
  return (
    <AdminCard>
      <AdminCardHeader
        title="Kargo sağlayıcıları"
        description="Gateway ortamlarını, bağlantı durumunu ve aktif sağlayıcıları yönetin. Secret değerleri gösterilmez."
      />
      {notice ? (
        <p
          role="status"
          className="m-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Sağlayıcı yapılandırması yok"
          description="Gateway migration çalıştırıldığında sağlayıcılar burada görünür."
        />
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border p-5">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-bold">
                    {item.carrier?.name ?? item.provider_key}
                  </h3>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    {item.provider_key} ·{" "}
                    {item.provider_key === "mock" ? "Mock" : "Harici"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}
                >
                  {item.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-50 p-3">
                  <dt className="text-zinc-500">Ortam</dt>
                  <dd className="font-bold capitalize">{item.environment}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <dt className="text-zinc-500">Health</dt>
                  <dd className="font-bold">{item.health_status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Son başarılı işlem</dt>
                  <dd>
                    {item.last_success_at
                      ? new Date(item.last_success_at).toLocaleString("tr-TR")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Son kontrol</dt>
                  <dd>
                    {item.last_health_check_at
                      ? new Date(item.last_health_check_at).toLocaleString(
                          "tr-TR",
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={item.is_active ? "outline" : "primary"}
                  onClick={() =>
                    void update(item, !item.is_active, item.environment)
                  }
                >
                  {item.is_active ? "Pasifleştir" : "Aktifleştir"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void update(
                      item,
                      item.is_active,
                      item.environment === "sandbox" ? "production" : "sandbox",
                    )
                  }
                >
                  {item.environment === "sandbox"
                    ? "Production'a al"
                    : "Sandbox'a al"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminCard>
  );
}
