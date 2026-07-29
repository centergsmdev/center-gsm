"use client";
import { Check } from "lucide-react";
import { ShippingCarrierLogo } from "@/components/checkout/shipping-carrier-logo";
export type CheckoutCarrier = {
  providerKey: string;
  name: string;
  estimatedDays: number;
  freeLabel: string;
  description: string;
  logoUrl?: string | null;
};
export const fallbackCheckoutCarriers: CheckoutCarrier[] = [
  ["yurtici", "Yurtiçi Kargo", 2],
  ["mng", "MNG Kargo", 3],
  ["aras", "Aras Kargo", 3],
  ["surat", "Sürat Kargo", 3],
  ["ptt", "PTT Kargo", 4],
  ["hepsijet", "Hepsijet", 2],
].map(([providerKey, name, days]) => ({
  providerKey: String(providerKey),
  name: String(name),
  estimatedDays: Number(days),
  freeLabel: "2.500 TL üzeri ücretsiz",
  description: "Türkiye geneli güvenli teslimat",
}));
export function ShippingCarrierSelection({
  items,
  value,
  onChange,
  loading,
}: {
  items: CheckoutCarrier[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Kargo firması seçin</legend>
      {loading ? (
        <div
          className="grid gap-3 sm:grid-cols-2"
          aria-label="Kargo firmaları yükleniyor"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl bg-zinc-100"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const selected = value === item.providerKey;
            return (
              <label
                key={item.providerKey}
                className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-all duration-200 ${selected ? "border-primary bg-red-50/60 shadow-md ring-1 ring-primary" : "border-border bg-white hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm"}`}
              >
                <input
                  type="radio"
                  name="selectedShippingProvider"
                  value={item.providerKey}
                  checked={selected}
                  onChange={() => onChange(item.providerKey)}
                  className="sr-only"
                />
                <span className="grid h-11 w-24 shrink-0 place-items-center rounded-xl border border-zinc-100 bg-white px-2 shadow-sm">
                  <ShippingCarrierLogo
                    providerKey={item.providerKey}
                    name={item.name}
                  />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-black">
                    {item.name}
                    {selected ? (
                      <Check
                        className="size-4 text-red-600"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Tahmini {item.estimatedDays} iş günü
                  </span>
                  <span className="mt-1 block text-xs font-bold text-emerald-700">
                    {item.freeLabel}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {item.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
      <label className="mt-4 block text-sm font-bold">
        Kargo notu <span className="font-normal text-muted">(opsiyonel)</span>
        <textarea
          name="shippingNote"
          maxLength={240}
          placeholder="Teslimat için kısa notunuz"
          className="mt-2 min-h-24 w-full rounded-xl border border-border bg-white px-4 py-3 text-base font-normal shadow-sm outline-none transition-all focus:border-primary focus:shadow-focus sm:text-sm"
        />
      </label>
    </fieldset>
  );
}
