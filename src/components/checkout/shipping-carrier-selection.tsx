"use client";
import { Check, PackageCheck } from "lucide-react";
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
                className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${selected ? "border-red-600 bg-red-50/50" : "border-border hover:border-zinc-400"}`}
              >
                <input
                  type="radio"
                  name="selectedShippingProvider"
                  value={item.providerKey}
                  checked={selected}
                  onChange={() => onChange(item.providerKey)}
                  className="sr-only"
                />
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
                  <PackageCheck className="size-5" aria-hidden="true" />
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
          className="mt-2 min-h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        />
      </label>
    </fieldset>
  );
}
