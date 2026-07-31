"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Instagram, PackageSearch } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import {
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { getAdminProduct } from "@/lib/admin/products";
import { getAdminVariantSetup } from "@/lib/admin/product-variants";
import { calculateMonthlyInstallment } from "@/lib/catalog/installments";
import { formatCurrency } from "@/lib/format";
import type { AdminProduct } from "@/types/admin-product";
import type { Tables } from "@/types/database";

type StudioData = {
  product: AdminProduct;
  colors: Tables<"product_colors">[];
  variants: Tables<"product_variants">[];
  variantImages: Tables<"product_images">[];
};

export function InstagramPreviewStudio({
  productId,
  siteUrl,
}: {
  productId?: string;
  siteUrl: string;
}) {
  const [data, setData] = useState<StudioData | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    void Promise.all([
      getAdminProduct(productId),
      getAdminVariantSetup(productId),
    ]).then(([productResult, variantResult]) => {
      if (!active) return;
      if (!productResult.data || !variantResult.data) {
        setError(true);
      } else {
        setData({
          product: productResult.data,
          colors: variantResult.data.colors,
          variants: variantResult.data.variants,
          variantImages: variantResult.data.images,
        });
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [productId]);

  if (!productId)
    return (
      <AdminCard>
        <div className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-600">
            <PackageSearch className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-black text-zinc-950">
            Önizlenecek ürünü seçin
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Bir ürünün düzenleme ekranındaki “Instagram Gönderisi Oluştur”
            butonunu kullanarak canlı önizlemeyi açın.
          </p>
          <Link
            href="/admin/urunler"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-zinc-950 px-5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Ürünlere git
          </Link>
        </div>
      </AdminCard>
    );
  if (loading) return <AdminLoadingState />;
  if (error || !data) return <AdminErrorState />;

  return <StudioWorkspace data={data} siteUrl={siteUrl} />;
}

function StudioWorkspace({
  data,
  siteUrl,
}: {
  data: StudioData;
  siteUrl: string;
}) {
  const { product, colors, variants, variantImages } = data;
  const images = [...product.images, ...variantImages];
  const primaryImage = product.primaryImage?.url ?? images[0]?.url;
  const defaultVariant =
    variants.find((variant) => variant.is_default && variant.is_active) ??
    variants.find((variant) => variant.is_active);
  const price = Number(defaultVariant?.price ?? product.price);
  const oldPriceValue = defaultVariant?.old_price ?? product.old_price;
  const oldPrice = oldPriceValue === null ? undefined : Number(oldPriceValue);
  const discountRate =
    oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : undefined;
  const installmentCount = product.installment_count ?? 3;
  const productUrl = `${siteUrl}/urun/${product.slug}`;
  const storageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          variants.flatMap((variant) =>
            variant.storage_value && variant.storage_unit
              ? [`${variant.storage_value} ${variant.storage_unit}`]
              : [],
          ),
        ),
      ),
    [variants],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <AdminCard className="overflow-hidden">
        <AdminCardHeader
          title="Instagram Gönderisi · Canlı Önizleme"
          description="Telefon şablonu için 1:1 preview canvas. İndirme bu fazda kapalıdır."
        />
        <div className="bg-zinc-100 p-4 sm:p-8">
          <div className="mx-auto aspect-square w-full max-w-[760px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex h-full flex-col p-[5%]">
              <div className="flex items-center justify-between gap-4">
                <Image
                  src="/logo.svg"
                  alt="CENTER GSM"
                  width={168}
                  height={48}
                  className="h-auto w-[26%] max-w-40"
                />
                <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-[clamp(8px,1.2vw,13px)] font-black uppercase tracking-[0.16em] text-white">
                  {product.category.name}
                </span>
              </div>

              <div className="mt-[4%] grid min-h-0 flex-1 grid-cols-[1.08fr_0.92fr] gap-[5%]">
                <div className="relative grid min-h-0 place-items-center overflow-hidden rounded-[24px] bg-zinc-50">
                  {primaryImage ? (
                    // Supabase Storage images are intentionally rendered from their saved URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={primaryImage}
                      alt={product.name}
                      className="size-full object-contain p-[8%]"
                    />
                  ) : (
                    <ImageIcon
                      className="size-16 text-zinc-300"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-col justify-center">
                  <p className="text-[clamp(9px,1.4vw,15px)] font-black uppercase tracking-[0.18em] text-red-600">
                    {product.brand.name}
                  </p>
                  <h2 className="mt-[3%] text-balance text-[clamp(20px,3.4vw,42px)] font-black leading-[1.02] tracking-[-0.055em] text-zinc-950">
                    {product.name}
                  </h2>
                  <div className="mt-[8%]">
                    {oldPrice ? (
                      <p className="text-[clamp(10px,1.4vw,16px)] font-semibold text-zinc-400 line-through">
                        {formatCurrency(oldPrice)}
                      </p>
                    ) : null}
                    <p className="text-[clamp(24px,4vw,48px)] font-black tracking-[-0.06em] text-zinc-950">
                      {formatCurrency(price)}
                    </p>
                    {discountRate ? (
                      <span className="mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-[clamp(9px,1.3vw,14px)] font-black text-red-600">
                        %{discountRate} indirim
                      </span>
                    ) : null}
                  </div>
                  {product.show_installments ? (
                    <p className="mt-[7%] text-[clamp(9px,1.35vw,15px)] font-bold leading-5 text-zinc-600">
                      {installmentCount} ×{" "}
                      {formatCurrency(
                        calculateMonthlyInstallment(price, installmentCount),
                      )}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-zinc-200 pt-[6%]">
                    <div className="text-[clamp(8px,1.1vw,12px)] font-semibold leading-5 text-zinc-500">
                      <p>{product.warranty_months} ay garanti</p>
                      <p>{product.stock_quantity} adet stok</p>
                    </div>
                    <span className="rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-zinc-200">
                      <QRCodeSVG value={productUrl} size={64} level="M" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminCard>

      <div className="space-y-6">
        <AdminCard className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-pink-50 text-pink-600">
              <Instagram className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-zinc-950">
                Telefon şablonu
              </p>
              <p className="text-xs text-zinc-500">Instagram · 1:1 gönderi</p>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <h3 className="text-sm font-black text-zinc-950">
            Otomatik ürün verileri
          </h3>
          <dl className="mt-4 space-y-3 text-xs">
            <DataRow label="Ürün" value={product.name} />
            <DataRow label="Marka" value={product.brand.name} />
            <DataRow label="Kategori" value={product.category.name} />
            <DataRow label="Görseller" value={`${images.length} adet`} />
            <DataRow label="Varyantlar" value={`${variants.length} adet`} />
            <DataRow
              label="Depolama"
              value={storageOptions.join(", ") || "Standart"}
            />
            <DataRow
              label="Renkler"
              value={
                colors
                  .map((color) => color.display_name ?? color.name)
                  .join(", ") || "Standart"
              }
            />
            <DataRow label="Fiyat" value={formatCurrency(price)} />
            <DataRow label="Garanti" value={`${product.warranty_months} ay`} />
            <DataRow label="Stok" value={`${product.stock_quantity} adet`} />
          </dl>
        </AdminCard>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="max-w-[210px] text-right font-bold text-zinc-900">
        {value}
      </dd>
    </div>
  );
}
