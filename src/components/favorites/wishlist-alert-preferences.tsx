"use client";

import { BellRing } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { getWishlistAlertPreferences, saveWishlistAlertPreference, WISHLIST_ALERT_STORAGE_KEY } from "@/lib/wishlist-alerts";
import type { WishlistAlertPreference } from "@/lib/wishlist-alerts";

const empty = (productId: string): WishlistAlertPreference => ({ productId, priceDrop: false, backInStock: false, promotionStarted: false });

function readFallback(): WishlistAlertPreference[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(WISHLIST_ALERT_STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is WishlistAlertPreference => typeof item === "object" && item !== null && "productId" in item) : [];
  } catch { return []; }
}

export function WishlistAlertPreferences({ productIds }: { productIds: string[] }) {
  const [preferences, setPreferences] = useState<WishlistAlertPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void getWishlistAlertPreferences().then((result) => {
      if (!active) return;
      const stored = readFallback();
      setPreferences(result.data?.length ? result.data : stored);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const update = useCallback(async (productId: string, key: "priceDrop" | "backInStock" | "promotionStarted", checked: boolean) => {
    const previous = preferences;
    const current = preferences.find((item) => item.productId === productId) ?? empty(productId);
    const nextItem = { ...current, [key]: checked };
    const next = [...preferences.filter((item) => item.productId !== productId), nextItem];
    setPreferences(next); setMessage("Alarm tercihi güncelleniyor.");
    localStorage.setItem(WISHLIST_ALERT_STORAGE_KEY, JSON.stringify(next));
    const result = await saveWishlistAlertPreference(nextItem);
    if (result.error) { setPreferences(previous); localStorage.setItem(WISHLIST_ALERT_STORAGE_KEY, JSON.stringify(previous)); setMessage(result.error); }
    else setMessage("Alarm tercihi kaydedildi.");
  }, [preferences]);
  if (loading) return <Card className="p-5 text-sm text-muted">Favori alarm tercihleri yükleniyor…</Card>;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-primary"><BellRing className="size-5" aria-hidden="true" /></span>
        <div><h2 className="font-black">Favori alarmları</h2><p className="mt-1 text-xs leading-5 text-muted">Fiyat, stok veya kampanya değiştiğinde bildirim merkezinde haber alın. E-posta ve SMS gönderimi bu aşamada kapalıdır.</p></div>
      </div>
      <div className="mt-5 space-y-3">
        {productIds.map((productId, index) => {
          const value = preferences.find((item) => item.productId === productId) ?? empty(productId);
          return <fieldset key={productId} className="rounded-xl border border-border p-4"><legend className="px-1 text-xs font-black">Favori ürün {index + 1}</legend><div className="mt-2 grid gap-3 sm:grid-cols-3">
            <AlertToggle label="Fiyat alarmı" checked={value.priceDrop} onChange={(checked) => void update(productId, "priceDrop", checked)} />
            <AlertToggle label="Stok alarmı" checked={value.backInStock} onChange={(checked) => void update(productId, "backInStock", checked)} />
            <AlertToggle label="Kampanya alarmı" checked={value.promotionStarted} onChange={(checked) => void update(productId, "promotionStarted", checked)} />
          </div></fieldset>;
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{message}</p>
    </Card>
  );
}

function AlertToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg bg-surface-subtle px-3 text-xs font-bold"><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-red-700" /></label>;
}
