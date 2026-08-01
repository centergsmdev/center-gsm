"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  BadgeCheck,
  CreditCard,
  Download,
  ImageIcon,
  Instagram,
  LoaderCircle,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { AdminProduct } from "@/types/admin-product";
import type { Tables } from "@/types/database";

type ProductColor = Tables<"product_colors">;
type ProductImage = Tables<"product_images">;
type ProductVariant = Tables<"product_variants">;
type StudioData = {
  product: AdminProduct;
  colors: ProductColor[];
  variants: ProductVariant[];
  variantImages: ProductImage[];
};

const storageKey = (variant: ProductVariant) =>
  variant.storage_value && variant.storage_unit
    ? `${variant.storage_value}-${variant.storage_unit}`
    : "";

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
  const { product } = data;
  const canvasRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const activeColors = useMemo(
    () => data.colors.filter((color) => color.is_active),
    [data.colors],
  );
  const activeVariants = useMemo(
    () => data.variants.filter((variant) => variant.is_active),
    [data.variants],
  );
  const initialVariant =
    activeVariants.find((variant) => variant.is_default) ?? activeVariants[0];
  const [selectedColorId, setSelectedColorId] = useState(
    initialVariant?.color_id ?? activeColors[0]?.id ?? "",
  );
  const [selectedStorageKey, setSelectedStorageKey] = useState(
    initialVariant ? storageKey(initialVariant) : "",
  );
  const [selectedImageId, setSelectedImageId] = useState("");
  const storageOptions = useMemo(
    () =>
      Array.from(
        new Map(
          activeVariants.flatMap((variant) => {
            const key = storageKey(variant);
            return key ? [[key, variant] as const] : [];
          }),
        ).entries(),
      ),
    [activeVariants],
  );
  const selectedVariant =
    activeVariants.find(
      (variant) =>
        (!selectedColorId || variant.color_id === selectedColorId) &&
        (!selectedStorageKey || storageKey(variant) === selectedStorageKey),
    ) ?? initialVariant;
  const selectedColor = activeColors.find(
    (color) => color.id === selectedColorId,
  );
  const colorImages = selectedColorId
    ? data.variantImages.filter((image) => image.color_id === selectedColorId)
    : [];
  const previewImages = colorImages.length ? colorImages : product.images;
  const selectedImage =
    previewImages.find((image) => image.id === selectedImageId) ??
    previewImages.find((image) => image.is_primary) ??
    previewImages[0] ??
    product.primaryImage;
  const price = Number(selectedVariant?.price ?? product.price);
  const oldPriceValue = selectedVariant?.old_price ?? product.old_price;
  const oldPrice = oldPriceValue === null ? undefined : Number(oldPriceValue);
  const discountRate =
    oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : undefined;
  const installmentCount = product.installment_count ?? 3;
  const productUrl = `${siteUrl}/urun/${product.slug}`;
  const warrantyMonths = Number(product.warranty_months);
  const availableStock = selectedVariant
    ? selectedVariant.stock_quantity
    : product.stock_quantity;

  useEffect(() => {
    setSelectedImageId("");
  }, [selectedColorId]);

  function selectColor(colorId: string) {
    setSelectedColorId(colorId);
    const compatible = activeVariants.find(
      (variant) =>
        variant.color_id === colorId &&
        (!selectedStorageKey || storageKey(variant) === selectedStorageKey),
    );
    if (!compatible) {
      const firstForColor = activeVariants.find(
        (variant) => variant.color_id === colorId,
      );
      setSelectedStorageKey(firstForColor ? storageKey(firstForColor) : "");
    }
  }

  async function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      await document.fonts.ready;
      await Promise.all(
        Array.from(canvas.querySelectorAll("img")).map(
          (image) =>
            image.complete ||
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      );
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(canvas, {
        width: 1080,
        height: 1080,
        canvasWidth: 1080,
        canvasHeight: 1080,
        pixelRatio: 1,
        backgroundColor: "#050508",
        cacheBust: true,
        style: {
          width: "1080px",
          height: "1080px",
          minWidth: "1080px",
          maxWidth: "1080px",
        },
      });
      const exportedImage = new window.Image();
      await new Promise<void>((resolve, reject) => {
        exportedImage.onload = () => resolve();
        exportedImage.onerror = () => reject(new Error("PNG doğrulanamadı."));
        exportedImage.src = dataUrl;
      });
      if (
        exportedImage.naturalWidth !== 1080 ||
        exportedImage.naturalHeight !== 1080
      )
        throw new Error("PNG ölçüsü doğrulanamadı.");
      const link = document.createElement("a");
      link.download = `${product.slug}-instagram-1080x1080.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setExportError(
        "PNG oluşturulamadı. Görsellerin yüklendiğini kontrol edip tekrar deneyin.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        <AdminCardHeader
          title="Instagram Gönderisi · Canlı Önizleme"
          description="Telefon şablonu · 1080 × 1080 koordinat oranı · Yüksek kaliteli PNG"
          action={
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-700 sm:inline-flex">
                <Instagram className="size-4" aria-hidden="true" />
                1:1 Gönderi
              </span>
              <button
                type="button"
                onClick={() => void downloadPng()}
                disabled={exporting}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-black text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
              >
                {exporting ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                {exporting ? "PNG hazırlanıyor…" : "PNG İndir"}
              </button>
            </div>
          }
        />
        <div className="overflow-x-auto bg-zinc-100 p-4 sm:p-8">
          <InstagramCanvas
            canvasRef={canvasRef}
            product={product}
            selectedColor={selectedColor}
            activeColors={activeColors}
            storageOptions={storageOptions}
            selectedStorageKey={selectedStorageKey}
            selectedImage={selectedImage}
            price={price}
            oldPrice={oldPrice}
            discountRate={discountRate}
            installmentCount={installmentCount}
            availableStock={availableStock}
            warrantyMonths={warrantyMonths}
            productUrl={productUrl}
            siteUrl={siteUrl}
          />
        </div>
        {exportError ? (
          <p
            className="border-t border-red-100 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {exportError}
          </p>
        ) : null}
      </AdminCard>

      <PreviewControls
        colors={activeColors}
        storageOptions={storageOptions}
        images={previewImages}
        selectedColorId={selectedColorId}
        selectedStorageKey={selectedStorageKey}
        selectedImageId={selectedImage?.id ?? ""}
        onColorChange={selectColor}
        onStorageChange={setSelectedStorageKey}
        onImageChange={setSelectedImageId}
      />
    </div>
  );
}

function InstagramCanvas({
  canvasRef,
  product,
  selectedColor,
  activeColors,
  storageOptions,
  selectedStorageKey,
  selectedImage,
  price,
  oldPrice,
  discountRate,
  installmentCount,
  availableStock,
  warrantyMonths,
  productUrl,
  siteUrl,
}: {
  canvasRef: RefObject<HTMLElement | null>;
  product: AdminProduct;
  selectedColor?: ProductColor;
  activeColors: ProductColor[];
  storageOptions: [string, ProductVariant][];
  selectedStorageKey: string;
  selectedImage?: ProductImage | null;
  price: number;
  oldPrice?: number;
  discountRate?: number;
  installmentCount: number;
  availableStock: number;
  warrantyMonths: number;
  productUrl: string;
  siteUrl: string;
}) {
  const domain = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const hasInstallments = product.show_installments && installmentCount > 1;

  return (
    <article
      ref={canvasRef}
      aria-label={`${product.name} Instagram gönderisi önizlemesi`}
      className="relative mx-auto aspect-square w-full min-w-[680px] max-w-[1080px] overflow-hidden bg-[#050508] text-white shadow-2xl [container-type:inline-size]"
    >
      <div className="pointer-events-none absolute -left-[10%] top-[12%] size-[52%] rounded-full bg-fuchsia-600/15 blur-[90px]" />
      <div className="pointer-events-none absolute -right-[12%] top-[4%] size-[48%] rounded-full bg-blue-500/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[2%] left-[25%] h-[16%] w-[54%] rounded-full bg-emerald-400/10 blur-[80px]" />

      <div className="relative grid h-full grid-rows-[8fr_61fr_18fr_13fr] px-[4.4cqw] pb-[3.1cqw] pt-[3.2cqw]">
        <header className="flex min-h-0 items-start justify-between">
          <div>
            <span className="grid h-[3.8cqw] w-[12.5cqw] place-items-center rounded-[0.75cqw] bg-white px-[0.9cqw]">
              <Image
                src="/logo.svg"
                alt="CENTER GSM"
                width={168}
                height={48}
                className="h-auto w-full"
              />
            </span>
            <p className="mt-[0.4cqw] text-[0.82cqw] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Teknolojinin Merkezi
            </p>
          </div>
          <span className="inline-flex items-center gap-[0.55cqw] rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-[1.1cqw] py-[0.55cqw] text-[0.95cqw] font-black text-fuchsia-300">
            <Instagram className="size-[1.25cqw]" aria-hidden="true" />
            Instagram
          </span>
        </header>

        <div className="grid min-h-0 grid-cols-[57fr_43fr] gap-[3.2cqw]">
          <section
            className="flex min-h-0 flex-col"
            aria-label="Ürün bilgileri"
          >
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2.2cqw] border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent">
              <div className="absolute left-1/2 top-[48%] size-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/20 bg-blue-500/5 shadow-[0_0_52px_rgba(232,121,249,0.18),inset_0_0_42px_rgba(59,130,246,0.13)]" />
              <div className="absolute bottom-[6%] left-1/2 h-[8%] w-[56%] -translate-x-1/2 rounded-full bg-blue-400/20 blur-[1.2cqw]" />
              {selectedImage?.url ? (
                // Supabase Storage images are intentionally rendered from their saved URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage.url}
                  alt={product.name}
                  className="relative z-10 size-full scale-[1.1] object-contain p-[3%] drop-shadow-[0_2.4cqw_3cqw_rgba(0,0,0,0.6)]"
                />
              ) : (
                <ImageIcon
                  className="absolute left-1/2 top-1/2 size-[7cqw] -translate-x-1/2 -translate-y-1/2 text-white/20"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="pt-[1.25cqw]">
              <p className="text-[1.25cqw] font-black uppercase tracking-[0.2em] text-fuchsia-400">
                {product.brand.name}
              </p>
              <h2 className="mt-[0.35cqw] line-clamp-2 max-w-[96%] text-[3.15cqw] font-black leading-[0.98] tracking-[-0.055em] text-white">
                {product.name}
              </h2>
              <div className="mt-[0.9cqw] flex min-h-[2.4cqw] items-center gap-[1.2cqw]">
                {storageOptions.length ? (
                  <div className="flex flex-wrap gap-[0.45cqw]">
                    {storageOptions.map(([key, variant]) => (
                      <span
                        key={key}
                        className={cn(
                          "grid min-w-[3.4cqw] place-items-center rounded-[0.55cqw] border px-[0.65cqw] py-[0.45cqw] text-[0.95cqw] font-black",
                          key === selectedStorageKey
                            ? "border-blue-300 bg-blue-400 text-zinc-950 shadow-[0_0_14px_rgba(96,165,250,0.38)]"
                            : "border-white/15 bg-white/[0.06] text-zinc-400",
                        )}
                      >
                        {variant.storage_value}
                        {variant.storage_unit === "TB" ? "TB" : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
                {activeColors.length ? (
                  <div
                    className="flex flex-wrap gap-[0.55cqw]"
                    aria-label="Renk seçenekleri"
                  >
                    {activeColors.map((color) => (
                      <span
                        key={color.id}
                        className={cn(
                          "size-[1.35cqw] rounded-full border border-white/40",
                          color.id === selectedColor?.id &&
                            "ring-[0.28cqw] ring-fuchsia-400/70 ring-offset-[0.2cqw] ring-offset-[#050508]",
                        )}
                        style={{ backgroundColor: color.hex_code }}
                        title={color.display_name ?? color.name}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section
            className="flex min-h-0 flex-col"
            aria-label="Ödeme seçenekleri"
          >
            <div className="flex items-center justify-between">
              <p className="text-[1.15cqw] font-black uppercase tracking-[0.16em] text-zinc-400">
                Ödeme seçenekleri
              </p>
              <Sparkles
                className="size-[1.8cqw] text-amber-300"
                strokeWidth={1.4}
                aria-hidden="true"
              />
            </div>
            <div className="mt-[0.8cqw] h-px bg-gradient-to-r from-fuchsia-400 via-blue-400 to-transparent" />
            <div className="mt-[1.2cqw] grid min-h-0 flex-1 grid-rows-3 gap-[1cqw]">
              <PaymentCard
                icon={ShoppingBag}
                eyebrow="Peşin fiyat"
                accent="pink"
              >
                <div className="flex min-w-0 items-end justify-between gap-[1cqw]">
                  <div className="min-w-0">
                    {oldPrice ? (
                      <p className="text-[1.15cqw] font-semibold text-zinc-500 line-through">
                        {formatCurrency(oldPrice)}
                      </p>
                    ) : null}
                    <p className="whitespace-nowrap text-[4.3cqw] font-black leading-none tracking-[-0.065em] text-white">
                      {formatCurrency(price)}
                    </p>
                  </div>
                  {discountRate ? (
                    <span className="shrink-0 rounded-full bg-fuchsia-400 px-[0.85cqw] py-[0.4cqw] text-[1cqw] font-black text-zinc-950">
                      %{discountRate} indirim
                    </span>
                  ) : null}
                </div>
              </PaymentCard>

              <PaymentCard
                icon={CreditCard}
                eyebrow="Kredi kartına vade farksız taksit"
                accent="blue"
              >
                <p className="text-[2.15cqw] font-black leading-tight text-white">
                  {hasInstallments
                    ? `${installmentCount} aya varan taksit imkânı`
                    : "Bu ürün için taksit seçeneği bulunmuyor"}
                </p>
                {hasInstallments ? (
                  <p className="mt-[0.45cqw] text-[1.2cqw] font-semibold text-blue-200">
                    Aylık{" "}
                    {formatCurrency(
                      calculateMonthlyInstallment(price, installmentCount),
                    )}
                  </p>
                ) : null}
              </PaymentCard>

              <PaymentCard
                icon={Store}
                eyebrow="Elden taksit imkânı"
                accent="green"
              >
                <p className="max-w-[92%] text-[1.55cqw] font-bold leading-[1.25] text-white">
                  Uygun ödeme seçenekleri için mağazamızla iletişime geçin.
                </p>
              </PaymentCard>
            </div>
          </section>
        </div>

        <section
          className="grid grid-cols-4 gap-[0.8cqw] border-y border-white/10 py-[1.45cqw]"
          aria-label="Alışveriş avantajları"
        >
          <TrustItem
            icon={BadgeCheck}
            title="Orijinal Ürün"
            description="Güvenilir ürün tedariği"
            accent="pink"
          />
          <TrustItem
            icon={ShieldCheck}
            title="Güvenli Alışveriş"
            description="Korunan alışveriş deneyimi"
            accent="blue"
          />
          <TrustItem
            icon={Truck}
            title="Aynı Gün Kargo"
            description={
              availableStock > 5
                ? "14.00'e kadar siparişlerde"
                : "Gönderim için bilgi alın"
            }
            accent="green"
          />
          <TrustItem
            icon={CreditCard}
            title={warrantyMonths > 0 ? "Resmî Garanti" : "Garanti Bilgisi"}
            description={
              warrantyMonths > 0
                ? `${warrantyMonths} ay güvence`
                : "Detaylar için bilgi alın"
            }
            accent="gold"
          />
        </section>

        <footer className="flex min-h-0 items-center justify-between gap-[2cqw] pt-[1.55cqw]">
          <div className="flex items-center gap-[1.2cqw]">
            <span className="rounded-[0.75cqw] bg-white p-[0.55cqw] shadow-[0_0_20px_rgba(255,255,255,0.16)]">
              <QRCodeSVG value={productUrl} size={74} level="M" />
            </span>
            <div className="text-[0.95cqw] font-semibold leading-[1.35] text-zinc-500">
              <p>{product.category.name}</p>
              <p>
                {availableStock > 0
                  ? "Stokta"
                  : "Stok bilgisi için iletişime geçin"}
              </p>
            </div>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[1.45cqw] font-black text-white">Hemen İncele</p>
            <p className="max-w-[38cqw] truncate text-[1.1cqw] font-semibold text-fuchsia-300">
              {domain}
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}

function PaymentCard({
  icon: Icon,
  eyebrow,
  accent,
  children,
}: {
  icon: typeof CreditCard;
  eyebrow: string;
  accent: "pink" | "blue" | "green";
  children: React.ReactNode;
}) {
  const styles = {
    pink: "border-fuchsia-400/35 before:bg-fuchsia-400 text-fuchsia-300",
    blue: "border-blue-400/35 before:bg-blue-400 text-blue-300",
    green: "border-emerald-400/35 before:bg-emerald-400 text-emerald-300",
  }[accent];
  return (
    <div
      className={cn(
        "relative min-h-0 overflow-hidden rounded-[1.5cqw] border bg-white/[0.045] px-[1.6cqw] py-[1.25cqw] before:absolute before:inset-y-0 before:left-0 before:w-[0.35cqw]",
        styles,
      )}
    >
      <div className="flex items-center gap-[0.7cqw]">
        <Icon className="size-[1.55cqw]" strokeWidth={1.8} aria-hidden="true" />
        <p className="text-[1.05cqw] font-black uppercase tracking-[0.12em]">
          {eyebrow}
        </p>
      </div>
      <div className="mt-[0.65cqw] text-white">{children}</div>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: typeof Truck;
  title: string;
  description: string;
  accent: "pink" | "blue" | "green" | "gold";
}) {
  const color = {
    pink: "bg-fuchsia-400 text-fuchsia-300",
    blue: "bg-blue-400 text-blue-300",
    green: "bg-emerald-400 text-emerald-300",
    gold: "bg-amber-300 text-amber-200",
  }[accent];
  return (
    <div className="relative flex min-w-0 items-center gap-[0.8cqw] px-[0.8cqw]">
      <span
        className={cn(
          "absolute inset-y-[8%] left-0 w-[0.22cqw] rounded-full",
          color.split(" ")[0],
        )}
      />
      <Icon
        className={cn("size-[2.2cqw] shrink-0", color.split(" ")[1])}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="truncate text-[1.2cqw] font-black text-white">{title}</p>
        <p className="truncate text-[0.9cqw] font-medium text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function PreviewControls({
  colors,
  storageOptions,
  images,
  selectedColorId,
  selectedStorageKey,
  selectedImageId,
  onColorChange,
  onStorageChange,
  onImageChange,
}: {
  colors: ProductColor[];
  storageOptions: [string, ProductVariant][];
  images: ProductImage[];
  selectedColorId: string;
  selectedStorageKey: string;
  selectedImageId: string;
  onColorChange: (value: string) => void;
  onStorageChange: (value: string) => void;
  onImageChange: (value: string) => void;
}) {
  return (
    <AdminCard>
      <AdminCardHeader
        title="Önizleme seçimleri"
        description="Seçimler yalnızca canlı canvas'ı değiştirir; ürün verisi kaydedilmez."
      />
      <div className="grid gap-6 p-5 lg:grid-cols-3 lg:p-6">
        <ControlGroup title="Ana ürün görseli">
          {images.length ? (
            <div className="flex flex-wrap gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => onImageChange(image.id)}
                  aria-pressed={image.id === selectedImageId}
                  aria-label={`${index + 1}. ürün görselini önizle`}
                  className={cn(
                    "relative size-16 overflow-hidden rounded-xl border bg-white p-1",
                    image.id === selectedImageId
                      ? "border-red-600 ring-2 ring-red-100"
                      : "border-zinc-200 hover:border-zinc-400",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt=""
                    className="size-full object-contain"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Ürün görseli bulunmuyor.</p>
          )}
        </ControlGroup>

        <ControlGroup title="Renk varyantı">
          {colors.length ? (
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => onColorChange(color.id)}
                  aria-pressed={color.id === selectedColorId}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-3 text-xs font-bold",
                    color.id === selectedColorId
                      ? "border-red-600 ring-2 ring-red-100"
                      : "border-zinc-200 hover:border-zinc-400",
                  )}
                >
                  <span
                    className="size-5 rounded-full border border-black/10"
                    style={{ backgroundColor: color.hex_code }}
                    aria-hidden="true"
                  />
                  {color.display_name ?? color.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Bu üründe renk varyantı yok.
            </p>
          )}
        </ControlGroup>

        <ControlGroup title="Depolama varyantı">
          {storageOptions.length ? (
            <div className="flex flex-wrap gap-2">
              {storageOptions.map(([key, variant]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onStorageChange(key)}
                  aria-pressed={key === selectedStorageKey}
                  className={cn(
                    "min-h-10 rounded-full border bg-white px-4 text-xs font-black",
                    key === selectedStorageKey
                      ? "border-red-600 ring-2 ring-red-100"
                      : "border-zinc-200 hover:border-zinc-400",
                  )}
                >
                  {variant.storage_value} {variant.storage_unit}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Bu üründe depolama varyantı yok.
            </p>
          )}
        </ControlGroup>
      </div>
    </AdminCard>
  );
}

function ControlGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-black text-zinc-950">{title}</h3>
      {children}
    </section>
  );
}
