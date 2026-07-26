"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";

const tabs = [
  "Açıklama",
  "Teknik Özellikler",
  "Kutu İçeriği",
  "Teslimat ve İade",
] as const;
type TabName = (typeof tabs)[number];

export function ProductTabs({ product }: { product: CatalogProduct }) {
  const [activeTab, setActiveTab] = useState<TabName>("Açıklama");
  return (
    <section
      aria-label="Ürün detayları"
      className="rounded-xl border border-border bg-surface shadow-xs"
    >
      <div
        className="flex overflow-x-auto border-b border-border px-2 sm:px-5"
        role="tablist"
        aria-label="Ürün bilgi sekmeleri"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls="product-tab-panel"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative min-h-14 shrink-0 px-3 text-xs font-bold text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5 sm:text-sm",
              activeTab === tab &&
                "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        id="product-tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="p-5 sm:p-8"
      >
        <TabContent tab={activeTab} product={product} />
      </div>
    </section>
  );
}

function TabContent({
  tab,
  product,
}: {
  tab: TabName;
  product: CatalogProduct;
}) {
  if (tab === "Açıklama")
    return (
      <div className="max-w-3xl">
        <h2 className="text-xl font-bold">
          Günlük teknoloji deneyimini yükseltin
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          {product.description} Premium malzeme kalitesi, dengeli performans ve
          kullanıcı odaklı detaylarla uzun süreli bir deneyim sunar.
        </p>
      </div>
    );
  if (tab === "Teknik Özellikler")
    return (
      <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
        {[
          ["Kategori", product.category],
          ["Model", product.model],
          ["Garanti", "2 yıl"],
          ["Bağlantı", "Yeni nesil kablosuz bağlantı"],
          ["Renk", product.accent],
          ["Menşei", "İthal"],
        ].map(([term, value]) => (
          <div
            key={term}
            className="flex justify-between gap-4 border-b border-border pb-3 text-sm"
          >
            <dt className="text-muted">{term}</dt>
            <dd className="text-right font-semibold text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    );
  if (tab === "Kutu İçeriği")
    return (
      <ul className="grid gap-3 text-sm text-muted sm:grid-cols-2">
        <li>
          • {product.brand} {product.model}
        </li>
        <li>• Şarj kablosu</li>
        <li>• Hızlı başlangıç kılavuzu</li>
        <li>• Garanti belgesi</li>
      </ul>
    );
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h2 className="font-bold">Teslimat</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Stoktaki ürünler özenle paketlenerek anlaşmalı kargo ile gönderilir.
        </p>
      </div>
      <div>
        <h2 className="font-bold">İade</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Teslimattan itibaren 14 gün içinde iade talebi oluşturabilirsiniz.
        </p>
      </div>
    </div>
  );
}
