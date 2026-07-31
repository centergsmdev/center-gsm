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
import { variantStorageKey } from "@/lib/catalog/variants";
import { cn } from "@/lib/utils";
import type {
  CatalogProduct,
  CatalogProductColor,
  CatalogProductVariant,
} from "@/types/product";
import type { CartVariant } from "@/types/cart";

type ProductInfoProps = {
  product: CatalogProduct;
  colors: CatalogProductColor[];
  variants: CatalogProductVariant[];
  storageOptions: CatalogProductVariant[];
  selectedColorId?: string;
  selectedStorageKey?: string;
  selectionRequired: boolean;
  selectionComplete: boolean;
  onColorChange: (colorId: string) => void;
  onStorageChange: (storageKey: string) => void;
  cartVariant?: CartVariant;
};

export function ProductInfo({
  product,
  colors,
  variants,
  storageOptions,
  selectedColorId,
  selectedStorageKey,
  selectionRequired,
  selectionComplete,
  onColorChange,
  onStorageChange,
  cartVariant,
}: ProductInfoProps) {
  const productName = `${product.brand} ${product.model}`;
  const stockLabel =
    product.stockStatus === "in-stock"
      ? `Stokta${product.availableStock !== undefined ? ` · ${product.availableStock} adet` : ""}`
      : product.stockStatus === "limited"
        ? `Son birkaç ürün${product.availableStock !== undefined ? ` · ${product.availableStock} adet` : ""}`
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
      className="home-premium-surface rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur lg:sticky lg:top-36"
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

      <Divider className="my-3" />
      {colors.length ? (
        <fieldset>
          <legend className="text-sm font-black text-foreground">
            Renk
            {selectedColorId ? (
              <span className="ml-2 font-medium text-muted">
                {
                  colors.find((color) => color.id === selectedColorId)
                    ?.displayName
                }
              </span>
            ) : null}
          </legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {colors.map((color) => {
              const selected = color.id === selectedColorId;
              const available = variants.some(
                (variant) => variant.colorId === color.id,
              );
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => onColorChange(color.id)}
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={`${color.displayName} rengini seç`}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-3 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40",
                    selected
                      ? "border-primary shadow-[0_0_0_3px_rgba(220,38,38,0.12)]"
                      : "border-border",
                  )}
                >
                  <span
                    className="size-7 rounded-full border border-black/10 shadow-inner ring-1 ring-white"
                    style={{ backgroundColor: color.hexCode }}
                    aria-hidden="true"
                  />
                  {color.displayName}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {storageOptions.length ? (
        <fieldset className="mt-3">
          <legend className="text-sm font-black text-foreground">
            Depolama
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {storageOptions.map((option) => {
              const key = variantStorageKey(option)!;
              const selected = key === selectedStorageKey;
              const available = variants.some(
                (variant) =>
                  variantStorageKey(variant) === key &&
                  (!selectedColorId || variant.colorId === selectedColorId),
              );
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onStorageChange(key)}
                  disabled={!available}
                  aria-pressed={selected}
                  className={cn(
                    "min-h-11 rounded-xl border px-4 py-2 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40",
                    selected
                      ? "border-primary bg-red-50 text-primary shadow-[0_0_0_2px_rgba(220,38,38,0.1)]"
                      : "border-border bg-white text-foreground",
                  )}
                >
                  {option.storageValue} {option.storageUnit}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {colors.length || storageOptions.length ? (
        <Divider className="my-3" />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {product.discountRate ? (
          <Badge variant="brand">%{product.discountRate} indirim</Badge>
        ) : null}
        <Badge variant={stockVariant} className="gap-2 px-3 py-2">
          <span className="size-2 rounded-full bg-current" aria-hidden="true" />
          {stockLabel}
        </Badge>
      </div>
      <div className="mt-3">
        {product.previousPrice ? (
          <p className="text-sm text-muted line-through">
            {formatCurrency(product.previousPrice)}
          </p>
        ) : null}
        <p className="text-4xl font-black tracking-[-0.045em] text-foreground">
          {formatCurrency(product.price)}
        </p>
        {product.showInstallments ? (
          <p className="mt-2 text-sm text-muted">
            <strong className="text-foreground">
              {product.installmentCount} ×{" "}
              {formatCurrency(product.monthlyInstallment)}
            </strong>
            {product.installmentNote ? ` · ${product.installmentNote}` : ""}
          </p>
        ) : null}
      </div>

      <Card className="mt-3 grid gap-1.5 border-0 bg-zinc-50 p-2 shadow-inner sm:grid-cols-2">
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
        selectionRequired={selectionRequired}
        selectionComplete={selectionComplete}
        variant={cartVariant}
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
    <div className="flex items-center gap-2 rounded-xl border border-white bg-white p-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-50 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-black text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-4 text-muted">{description}</p>
      </div>
    </div>
  );
}
