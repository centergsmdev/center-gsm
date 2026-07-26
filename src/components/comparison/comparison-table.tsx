"use client";

import Link from "next/link";
import { Star, Trash2 } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductVisual } from "@/components/catalog/product-visual";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { formatCurrency } from "@/lib/format";
import {
  getProductSpecifications,
  specificationLabels,
} from "@/lib/comparison/product-specifications";
import { useComparison } from "@/providers/comparison-provider";
import type { CatalogProduct } from "@/types/product";

function stockLabel(status: CatalogProduct["stockStatus"]) {
  if (status === "in-stock") return "Stokta";
  if (status === "limited") return "Sınırlı stok";
  return "Tükendi";
}

export function ComparisonTable() {
  const { comparisonProducts, removeComparison, clearComparison } =
    useComparison();

  return (
    <section aria-labelledby="comparison-table-title">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p
          id="comparison-table-title"
          className="text-sm font-semibold text-muted"
        >
          {comparisonProducts.length} / 4 ürün karşılaştırılıyor
        </p>
        <Button variant="ghost" size="sm" onClick={clearComparison}>
          <Trash2 className="size-4" aria-hidden="true" />
          Tümünü Temizle
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <table
          className="w-full table-fixed border-collapse"
          style={{ minWidth: `${150 + comparisonProducts.length * 230}px` }}
        >
          <caption className="sr-only">
            Seçilen ürünlerin özellik karşılaştırması
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-raised w-[150px] border-b border-r border-border bg-zinc-50 p-4 text-left align-bottom text-xs font-black uppercase tracking-wider text-muted"
              >
                Ürün
              </th>
              {comparisonProducts.map((product) => (
                <th
                  key={product.id}
                  scope="col"
                  className="w-[230px] border-b border-r border-border p-4 align-top last:border-r-0"
                >
                  <div className="relative mx-auto h-32 overflow-hidden rounded-lg bg-surface-subtle sm:h-40">
                    <ProductVisual product={product} />
                  </div>
                  <Link
                    href={`/urun/${product.slug}`}
                    className="mt-4 block rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                      {product.brand}
                    </span>
                    <span className="mt-1 block text-sm font-black text-foreground">
                      {product.model}
                    </span>
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <AddToCartButton
                      product={product}
                      productId={product.id}
                      productName={`${product.brand} ${product.model}`}
                      className="min-w-0 flex-1 px-3"
                    />
                    <IconButton
                      label={`${product.brand} ${product.model} ürününü kaldır`}
                      size="sm"
                      variant="outline"
                      onClick={() => removeComparison(product.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ComparisonRow
              label="Marka"
              products={comparisonProducts}
              render={(p) => p.brand}
            />
            <ComparisonRow
              label="Model"
              products={comparisonProducts}
              render={(p) => p.model}
            />
            <ComparisonRow
              label="SKU"
              products={comparisonProducts}
              render={(p) => p.id.toUpperCase()}
            />
            <ComparisonRow
              label="Fiyat"
              products={comparisonProducts}
              highlight
              render={(p) => formatCurrency(p.price)}
            />
            <ComparisonRow
              label="Eski fiyat"
              products={comparisonProducts}
              render={(p) =>
                p.previousPrice ? formatCurrency(p.previousPrice) : "—"
              }
            />
            <ComparisonRow
              label="İndirim"
              products={comparisonProducts}
              render={(p) => (p.discountRate ? `%${p.discountRate}` : "—")}
            />
            <ComparisonRow
              label="Stok"
              products={comparisonProducts}
              render={(p) => stockLabel(p.stockStatus)}
            />
            <ComparisonRow
              label="Puan"
              products={comparisonProducts}
              render={(p) => (
                <span className="inline-flex items-center gap-1">
                  <Star
                    className="size-4 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                  {p.rating.toFixed(1)}
                </span>
              )}
            />
            <ComparisonRow
              label="Yorum"
              products={comparisonProducts}
              render={(p) => `${p.reviewCount} yorum`}
            />
            <ComparisonRow
              label="Garanti"
              products={comparisonProducts}
              render={() => "2 yıl resmi garanti"}
            />
            <ComparisonRow
              label="Kargo"
              products={comparisonProducts}
              render={(p) =>
                [p.sameDayShipping && "Aynı gün", p.freeShipping && "Ücretsiz"]
                  .filter(Boolean)
                  .join(" · ") || "Standart"
              }
            />
            {specificationLabels.map((label) => (
              <ComparisonRow
                key={label}
                label={label}
                products={comparisonProducts}
                render={(p) => getProductSpecifications(p)[label] ?? "—"}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted sm:hidden">
        Tüm özellikleri görmek için tabloyu yatay kaydırabilirsiniz.
      </p>
    </section>
  );
}

function ComparisonRow({
  label,
  products,
  render,
  highlight = false,
}: {
  label: string;
  products: CatalogProduct[];
  render: (product: CatalogProduct) => React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <tr className="transition-colors hover:bg-surface-subtle/60">
      <th
        scope="row"
        className="sticky left-0 z-raised w-[150px] border-b border-r border-border bg-zinc-50 p-4 text-left text-xs font-bold text-zinc-700"
      >
        {label}
      </th>
      {products.map((product) => (
        <td
          key={product.id}
          className={`w-[230px] border-b border-r border-border p-4 text-sm last:border-r-0 ${highlight ? "font-black text-foreground" : "text-zinc-700"}`}
        >
          {render(product)}
        </td>
      ))}
    </tr>
  );
}
