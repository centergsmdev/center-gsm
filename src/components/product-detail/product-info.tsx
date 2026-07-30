import {
  Box,
  PackageCheck,
  CreditCard,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";

import { PurchaseControls } from "@/components/product-detail/purchase-controls";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/product";

export function ProductInfo({ product }: { product: CatalogProduct }) {
  const productName = `${product.brand} ${product.model}`;
  const stockLabel =
    product.stockStatus === "in-stock"
      ? "Stokta"
      : product.stockStatus === "limited"
        ? "Son birkaç ürün"
        : "Tükendi";
  const stockVariant =
    product.stockStatus === "in-stock"
      ? "success"
      : product.stockStatus === "limited"
        ? "warning"
        : "danger";

  return (
    <section
      aria-labelledby="product-title"
      className="home-premium-surface rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-6 lg:sticky lg:top-36"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
        {product.brand}
      </p>
      <h1
        id="product-title"
        className="mt-2 text-balance text-3xl font-black tracking-[-0.045em] text-foreground sm:text-4xl"
      >
        {product.model}
      </h1>
      {product.shortDescription ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          {product.shortDescription}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 font-bold">
          <Star
            className="size-4 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
          {product.rating.toFixed(1)}
        </span>
        <span className="text-muted">{product.reviewCount} yorum</span>
        <Divider orientation="vertical" className="h-4" />
        <span className="text-muted">
          SKU: {product.sku ?? `CG-${product.id.slice(2).padStart(6, "0")}`}
        </span>
      </div>

      <Divider className="my-5" />
      <div className="flex flex-wrap items-center gap-2">
        {product.discountRate ? (
          <Badge variant="brand">%{product.discountRate} indirim</Badge>
        ) : null}
        <Badge variant={stockVariant} className="gap-2 px-3 py-2">
          <span className="size-2 rounded-full bg-current" aria-hidden="true" />
          {stockLabel}
        </Badge>
      </div>
      <div className="mt-4">
        {product.previousPrice ? (
          <p className="text-sm text-muted line-through">
            {formatCurrency(product.previousPrice)}
          </p>
        ) : null}
        <p className="text-4xl font-black tracking-[-0.045em] text-foreground">
          {formatCurrency(product.price)}
        </p>
        <p className="mt-2 text-sm text-muted">
          <strong className="text-foreground">
            {product.installmentCount} ay ×{" "}
            {formatCurrency(product.monthlyInstallment)}
          </strong>{" "}
          taksit imkânı
        </p>
      </div>

      <Card className="mt-5 grid gap-2 border-0 bg-zinc-50 p-2 shadow-inner sm:grid-cols-2">
        {product.sameDayShipping ? (
          <InfoRow
            icon={PackageCheck}
            title="Aynı gün kargo"
            description="14.00'e kadar verilen siparişlerde"
          />
        ) : null}
        <InfoRow
          icon={CreditCard}
          title="Güvenli ödeme"
          description="Şifreli ödeme altyapısı"
        />
        {product.freeShipping ? (
          <InfoRow
            icon={Truck}
            title="Ücretsiz kargo"
            description="Türkiye'nin her yerine"
          />
        ) : null}
        <InfoRow
          icon={ShieldCheck}
          title="Orijinal ürün garantisi"
          description={`${product.warrantyMonths ?? 24} ay resmi distribütör garantili`}
        />
      </Card>

      <PurchaseControls
        product={product}
        productId={product.id}
        productName={productName}
      />
    </section>
  );
}

function InfoRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Box;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted">{description}</p>
      </div>
    </div>
  );
}
