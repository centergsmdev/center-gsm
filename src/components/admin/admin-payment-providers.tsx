"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, CircleOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { getPaymentProviders, updatePaymentProvider } from "@/lib/payments";
import type { PaymentProviderRow } from "@/lib/payments";

const healthLabels = {
  unknown: "Kontrol edilmedi",
  healthy: "Sağlıklı",
  degraded: "Yavaş",
  down: "Erişilemiyor",
} as const;

export function AdminPaymentProviders() {
  const [providers, setProviders] = useState<PaymentProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getPaymentProviders();
    if (result.data) {
      setProviders(result.data);
      setError("");
    } else setError(result.error ?? "Sağlayıcılar yüklenemedi.");
    setLoading(false);
  }, []);

  useEffect(() => void load(), [load]);

  async function update(
    provider: PaymentProviderRow,
    isActive: boolean,
    mode: "sandbox" | "production",
  ) {
    setSavingId(provider.id);
    setNotice("");
    const result = await updatePaymentProvider(provider.id, isActive, mode);
    if (!result.data) setError(result.error ?? "Sağlayıcı güncellenemedi.");
    else {
      setNotice(`${provider.name} ayarları güncellendi.`);
      await load();
    }
    setSavingId(null);
  }

  return (
    <AdminCard>
      <AdminCardHeader
        title="Ödeme sağlayıcıları"
        description="Sağlayıcı durumunu ve çalışma ortamını güvenli biçimde yönetin. Gizli anahtarlar bu ekranda gösterilmez."
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
      ) : providers.length === 0 ? (
        <AdminEmptyState
          title="Ödeme sağlayıcısı bulunamadı"
          description="Migration çalıştırıldıktan sonra sağlayıcı kayıtları burada görünür."
        />
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {providers.map((provider) => (
            <article
              key={provider.id}
              className="rounded-2xl border border-zinc-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-zinc-950 text-white">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-zinc-950">{provider.name}</h3>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      {provider.code}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${provider.is_active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}
                >
                  {provider.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-50 p-3">
                  <dt className="text-zinc-500">Ortam</dt>
                  <dd className="mt-1 font-bold capitalize">{provider.mode}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <dt className="text-zinc-500">Sağlık</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-bold">
                    <Activity className="size-4" />
                    {healthLabels[provider.health_status]}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-zinc-500">
                Son bağlantı:{" "}
                {provider.last_connected_at
                  ? new Date(provider.last_connected_at).toLocaleString("tr-TR")
                  : "Henüz yok"}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={provider.is_active ? "outline" : "primary"}
                  disabled={savingId === provider.id}
                  onClick={() =>
                    void update(provider, !provider.is_active, provider.mode)
                  }
                >
                  {provider.is_active ? (
                    <CircleOff className="size-4" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {provider.is_active ? "Pasifleştir" : "Aktifleştir"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={savingId === provider.id}
                  onClick={() =>
                    void update(
                      provider,
                      provider.is_active,
                      provider.mode === "sandbox" ? "production" : "sandbox",
                    )
                  }
                >
                  {provider.mode === "sandbox"
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
