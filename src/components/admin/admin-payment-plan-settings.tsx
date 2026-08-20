"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Save } from "lucide-react";

import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass, AdminField } from "@/components/admin/admin-form";
import { Button } from "@/components/ui/button";
import {
  formatBasisPoints,
  formatMinorCurrency,
  liraToMinor,
  type PaymentPlanConfig,
} from "@/lib/payment-plan/engine";

function percentToBps(value: string) {
  const number = Number(value.replace(",", "."));
  const bps = Math.round(number * 100);
  return Number.isFinite(number) && Number.isSafeInteger(bps) ? bps : -1;
}

function parseCounts(value: string) {
  return value
    .split(/[\s,;/]+/)
    .filter(Boolean)
    .map(Number);
}

export function AdminPaymentPlanSettings() {
  const [items, setItems] = useState<PaymentPlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const active = useMemo(() => items[0] ?? null, [items]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/payment-plan-settings", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        configurations?: PaymentPlanConfig[];
        error?: string;
      };
      if (!response.ok || !payload.configurations)
        throw new Error(payload.error || "Ödeme planı ayarları yüklenemedi.");
      setItems(payload.configurations);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ödeme planı ayarları yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => void load(), []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const form = new FormData(event.currentTarget);
    let thresholdMinor: number;
    try {
      thresholdMinor = liraToMinor(String(form.get("threshold")));
    } catch {
      setError("Fiyat sınırını kontrol edin.");
      return;
    }
    const payload = {
      thresholdMinor,
      aboveThresholdDownPaymentBps: percentToBps(String(form.get("aboveRate"))),
      belowThresholdDownPaymentBps: percentToBps(String(form.get("belowRate"))),
      installmentFinanceChargeBps: percentToBps(
        String(form.get("financeRate")),
      ),
      installmentCounts: parseCounts(String(form.get("installmentCounts"))),
      creditCardFinanceChargeBps: percentToBps(
        String(form.get("cardFinanceRate")),
      ),
      creditCardInstallmentCounts: parseCounts(
        String(form.get("cardInstallmentCounts")),
      ),
    };
    if (
      !window.confirm(
        "Yeni bir ödeme planı revizyonu oluşturulacak. Mevcut başvurular değişmeyecek. Devam edilsin mi?",
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payment-plan-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "Ödeme planı kaydedilemedi.");
      setMessage("Yeni ödeme planı revizyonu aktif edildi.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Ödeme planı kaydedilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-52 items-center justify-center text-sm font-semibold text-zinc-600">
        <LoaderCircle className="mr-2 size-5 animate-spin" /> Ödeme planı
        ayarları yükleniyor…
      </div>
    );

  return (
    <div className="space-y-6">
      {error || message ? (
        <p
          role={error ? "alert" : "status"}
          className={`flex items-center gap-2 rounded-xl p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {error ? (
            <AlertCircle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {error || message}
        </p>
      ) : null}

      <AdminCard>
        <AdminCardHeader
          title="Aktif ödeme planı"
          description="Yeni ürün hesaplamaları ve elden taksit başvuruları bu revision'ı kullanır."
        />
        <div className="p-5 sm:p-6">
          {active ? (
            <form className="space-y-6" onSubmit={save}>
              <div className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                Aktif revizyon: {active.revision} · Fiyat sınırı:{" "}
                {formatMinorCurrency(active.thresholdMinor)}
              </div>
              <div>
                <h2 className="font-black">Elden Taksit</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <AdminField label="Fiyat sınırı (TL)" htmlFor="threshold">
                    <input
                      id="threshold"
                      name="threshold"
                      inputMode="decimal"
                      className={adminControlClass}
                      defaultValue={active.thresholdMinor / 100}
                      required
                    />
                  </AdminField>
                  <AdminField
                    label="Sınır ve üzeri peşinat (%)"
                    htmlFor="above-rate"
                  >
                    <input
                      id="above-rate"
                      name="aboveRate"
                      inputMode="decimal"
                      className={adminControlClass}
                      defaultValue={formatBasisPoints(
                        active.aboveThresholdDownPaymentBps,
                      )}
                      required
                    />
                  </AdminField>
                  <AdminField
                    label="Sınır altı peşinat (%)"
                    htmlFor="below-rate"
                  >
                    <input
                      id="below-rate"
                      name="belowRate"
                      inputMode="decimal"
                      className={adminControlClass}
                      defaultValue={formatBasisPoints(
                        active.belowThresholdDownPaymentBps,
                      )}
                      required
                    />
                  </AdminField>
                  <AdminField label="Vade farkı (%)" htmlFor="finance-rate">
                    <input
                      id="finance-rate"
                      name="financeRate"
                      inputMode="decimal"
                      className={adminControlClass}
                      defaultValue={formatBasisPoints(
                        active.installmentFinanceChargeBps,
                      )}
                      required
                    />
                  </AdminField>
                  <AdminField
                    label="Aktif vadeler (ay)"
                    htmlFor="installment-counts"
                  >
                    <input
                      id="installment-counts"
                      name="installmentCounts"
                      className={adminControlClass}
                      defaultValue={active.installmentCounts.join(", ")}
                      placeholder="3, 6, 9, 12"
                      required
                    />
                  </AdminField>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6">
                <h2 className="font-black">Kredi Kartı</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Bu ayarlar yalnız bilgilendirme hesaplayıcısında kullanılır;
                  checkout tahsilat mantığını değiştirmez.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <AdminField
                    label="Vade farkı (%)"
                    htmlFor="card-finance-rate"
                  >
                    <input
                      id="card-finance-rate"
                      name="cardFinanceRate"
                      inputMode="decimal"
                      className={adminControlClass}
                      defaultValue={formatBasisPoints(
                        active.creditCardFinanceChargeBps,
                      )}
                      readOnly
                      required
                    />
                  </AdminField>
                  <AdminField
                    label="Aktif vadeler (ay)"
                    htmlFor="card-installment-counts"
                  >
                    <input
                      id="card-installment-counts"
                      name="cardInstallmentCounts"
                      className={adminControlClass}
                      defaultValue={active.creditCardInstallmentCounts.join(
                        ", ",
                      )}
                      placeholder="3, 6, 9, 12"
                      required
                    />
                  </AdminField>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Yeni Revizyon Oluştur
                </Button>
              </div>
            </form>
          ) : (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              Aktif ödeme planı bulunmuyor.
            </p>
          )}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Revizyon geçmişi"
          description="Geçmiş başvuru snapshot'larının kullandığı ayarlar değiştirilemez."
        />
        <div className="divide-y divide-zinc-100">
          {items.map((item, index) => (
            <div key={item.id} className="p-5 text-sm sm:px-6">
              <p className="font-bold">
                Revision {item.revision} {index === 0 ? "· Aktif" : ""}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Sınır {formatMinorCurrency(item.thresholdMinor)} · Peşinat %
                {formatBasisPoints(item.aboveThresholdDownPaymentBps)} / %
                {formatBasisPoints(item.belowThresholdDownPaymentBps)} · Vade
                farkı %{formatBasisPoints(item.installmentFinanceChargeBps)} ·{" "}
                {item.installmentCounts.join(" / ")} ay
              </p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
