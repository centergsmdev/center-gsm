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
const variantTitle = (variant?: ProductVariant) => {
  const attributes = variant?.attributes;
  if (
    !attributes ||
    Array.isArray(attributes) ||
    typeof attributes !== "object"
  )
    return undefined;
  const title = attributes.variantTitle;
  return typeof title === "string" && title.trim() ? title.trim() : undefined;
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
  const colorImages = selectedColorId
    ? data.variantImages.filter((image) => image.color_id === selectedColorId)
    : [];
  const previewImages = colorImages.length ? colorImages : product.images;
  const selectedImage =
    previewImages.find((image) => image.id === selectedImageId) ??
    previewImages.find((image) => image.is_primary) ??
    previewImages[0] ??
    product.primaryImage;
  const { cutoutImage, cutoutProcessing } = useStudioCutout(selectedImage?.url);
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
  const productName = variantTitle(selectedVariant) ?? product.name;

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
    if (!canvas || exporting || cutoutProcessing) return;
    setExporting(true);
    setExportError("");
    const originalInlineStyle = canvas.getAttribute("style");
    try {
      canvas.style.width = "1080px";
      canvas.style.minWidth = "1080px";
      canvas.style.maxWidth = "1080px";
      canvas.style.height = "1080px";
      canvas.style.flex = "none";
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
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
      const { snapdom } = await import("@zumer/snapdom");
      const exportedImage = await snapdom.toPng(canvas, {
        width: 1080,
        height: 1080,
        scale: 1,
        dpr: 1,
        backgroundColor: "#050508",
        embedFonts: true,
        compress: false,
        reconcile: true,
        fast: false,
        outerTransforms: false,
        outerShadows: false,
      });
      if (!exportedImage.complete)
        await new Promise<void>((resolve, reject) => {
          exportedImage.onload = () => resolve();
          exportedImage.onerror = () => reject(new Error("PNG doğrulanamadı."));
        });
      if (
        exportedImage.naturalWidth !== 1080 ||
        exportedImage.naturalHeight !== 1080
      )
        throw new Error("PNG ölçüsü doğrulanamadı.");
      const link = document.createElement("a");
      link.download = `${product.slug}-instagram-1080x1080.png`;
      link.href = exportedImage.src;
      link.click();
    } catch {
      setExportError(
        "PNG oluşturulamadı. Görsellerin yüklendiğini kontrol edip tekrar deneyin.",
      );
    } finally {
      if (originalInlineStyle === null) canvas.removeAttribute("style");
      else canvas.setAttribute("style", originalInlineStyle);
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
                disabled={exporting || cutoutProcessing}
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
                {exporting
                  ? "PNG hazırlanıyor…"
                  : cutoutProcessing
                    ? "Ürün ayıklanıyor…"
                    : "PNG İndir"}
              </button>
            </div>
          }
        />
        <div className="overflow-x-auto bg-zinc-100 p-4 sm:p-8">
          <InstagramCanvas
            canvasRef={canvasRef}
            product={product}
            productName={productName}
            activeColors={activeColors}
            storageOptions={storageOptions}
            selectedStorageKey={selectedStorageKey}
            cutoutImage={cutoutImage}
            price={price}
            oldPrice={oldPrice}
            discountRate={discountRate}
            installmentCount={installmentCount}
            availableStock={availableStock}
            warrantyMonths={warrantyMonths}
            productUrl={productUrl}
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

function useStudioCutout(source?: string) {
  const [cutoutImage, setCutoutImage] = useState<string>();
  const [cutoutProcessing, setCutoutProcessing] = useState(Boolean(source));

  useEffect(() => {
    if (!source) {
      setCutoutImage(undefined);
      setCutoutProcessing(false);
      return;
    }
    let active = true;
    setCutoutImage(undefined);
    setCutoutProcessing(true);
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const maxSide = 1800;
        const scale = Math.min(
          1,
          maxSide / Math.max(image.width, image.height),
        );
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);
        const pixels = frame.data;
        const corners = [
          0,
          (width - 1) * 4,
          (height - 1) * width * 4,
          (height * width - 1) * 4,
        ];
        const lightCorners = corners.filter(
          (index) =>
            pixels[index] > 215 &&
            pixels[index + 1] > 215 &&
            pixels[index + 2] > 215,
        );
        if (lightCorners.length < 3) {
          if (active) {
            setCutoutImage(source);
            setCutoutProcessing(false);
          }
          return;
        }
        const background = lightCorners.reduce(
          (sum, index) => [
            sum[0] + pixels[index] / lightCorners.length,
            sum[1] + pixels[index + 1] / lightCorners.length,
            sum[2] + pixels[index + 2] / lightCorners.length,
          ],
          [0, 0, 0],
        );
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;
        const enqueue = (position: number) => {
          if (visited[position]) return;
          const pixel = position * 4;
          const distance = Math.hypot(
            pixels[pixel] - background[0],
            pixels[pixel + 1] - background[1],
            pixels[pixel + 2] - background[2],
          );
          const brightness =
            (pixels[pixel] + pixels[pixel + 1] + pixels[pixel + 2]) / 3;
          if (distance > 58 || brightness < 190) return;
          visited[position] = 1;
          queue[tail++] = position;
        };
        for (let x = 0; x < width; x += 1) {
          enqueue(x);
          enqueue((height - 1) * width + x);
        }
        for (let y = 0; y < height; y += 1) {
          enqueue(y * width);
          enqueue(y * width + width - 1);
        }
        while (head < tail) {
          const position = queue[head++];
          const x = position % width;
          const y = Math.floor(position / width);
          const pixel = position * 4;
          const distance = Math.hypot(
            pixels[pixel] - background[0],
            pixels[pixel + 1] - background[1],
            pixels[pixel + 2] - background[2],
          );
          pixels[pixel + 3] =
            distance < 30 ? 0 : Math.round((distance - 30) * 9);
          if (x > 0) enqueue(position - 1);
          if (x + 1 < width) enqueue(position + 1);
          if (y > 0) enqueue(position - width);
          if (y + 1 < height) enqueue(position + width);
        }
        context.putImageData(frame, 0, 0);
        if (active) {
          let minX = width;
          let minY = height;
          let maxX = -1;
          let maxY = -1;

          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              if (pixels[(y * width + x) * 4 + 3] <= 12) continue;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }

          if (maxX >= minX && maxY >= minY) {
            const contentWidth = maxX - minX + 1;
            const contentHeight = maxY - minY + 1;
            const padding = Math.max(
              2,
              Math.round(Math.max(contentWidth, contentHeight) * 0.025),
            );
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropWidth = Math.min(
              width - cropX,
              contentWidth + padding * 2,
            );
            const cropHeight = Math.min(
              height - cropY,
              contentHeight + padding * 2,
            );
            const trimmedCanvas = document.createElement("canvas");
            trimmedCanvas.width = cropWidth;
            trimmedCanvas.height = cropHeight;
            const trimmedContext = trimmedCanvas.getContext("2d");

            trimmedContext?.drawImage(
              canvas,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
              0,
              0,
              cropWidth,
              cropHeight,
            );
            setCutoutImage(trimmedCanvas.toDataURL("image/png"));
          } else {
            setCutoutImage(canvas.toDataURL("image/png"));
          }
          setCutoutProcessing(false);
        }
      } catch {
        if (active) {
          setCutoutImage(source);
          setCutoutProcessing(false);
        }
      }
    };
    image.onerror = () => {
      if (active) {
        setCutoutImage(source);
        setCutoutProcessing(false);
      }
    };
    image.src = source;
    return () => {
      active = false;
    };
  }, [source]);

  return { cutoutImage, cutoutProcessing };
}

function InstagramCanvas({
  canvasRef,
  product,
  productName,
  activeColors,
  storageOptions,
  selectedStorageKey,
  cutoutImage,
  price,
  oldPrice,
  discountRate,
  installmentCount,
  availableStock,
  warrantyMonths,
  productUrl,
}: {
  canvasRef: RefObject<HTMLElement | null>;
  product: AdminProduct;
  productName: string;
  activeColors: ProductColor[];
  storageOptions: [string, ProductVariant][];
  selectedStorageKey: string;
  cutoutImage?: string;
  price: number;
  oldPrice?: number;
  discountRate?: number;
  installmentCount: number;
  availableStock: number;
  warrantyMonths: number;
  productUrl: string;
}) {
  const domain = "centergsm.com.tr";
  const hasInstallments = product.show_installments && installmentCount > 1;
  const productNameSize =
    productName.length > 52
      ? "text-[2.45cqw]"
      : productName.length > 34
        ? "text-[2.9cqw]"
        : "text-[3.35cqw]";

  return (
    <article
      ref={canvasRef}
      aria-label={`${productName} Instagram gönderisi önizlemesi`}
      className="relative mx-auto aspect-square w-full min-w-[680px] max-w-[1080px] overflow-hidden bg-[#050508] text-white shadow-2xl [container-type:inline-size]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_35%,rgba(37,99,235,0.2),transparent_27%),radial-gradient(circle_at_48%_28%,rgba(217,70,239,0.2),transparent_25%),radial-gradient(circle_at_86%_70%,rgba(59,130,246,0.13),transparent_28%),linear-gradient(145deg,#02030a_0%,#080312_48%,#02040b_100%)]" />
      <div className="pointer-events-none absolute -left-[18%] top-[19%] h-px w-[80%] rotate-[-18deg] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_18px_#3b82f6]" />
      <div className="pointer-events-none absolute left-[16%] top-[24%] h-px w-[62%] rotate-[-38deg] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent shadow-[0_0_24px_#d946ef]" />
      <div className="pointer-events-none absolute left-[38%] top-[10%] h-px w-[50%] rotate-[132deg] bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70 shadow-[0_0_16px_#22d3ee]" />
      <div className="pointer-events-none absolute right-[5%] top-[12%] size-[26%] rotate-45 border-r border-t border-fuchsia-400/25" />
      <div className="pointer-events-none absolute bottom-[18%] left-[4%] h-[20%] w-[62%] rounded-[50%] bg-fuchsia-500/10 blur-[4cqw]" />

      <div
        className="absolute inset-[3.5%] grid grid-rows-[7fr_64fr_17fr_12fr] px-[2cqw] pb-[1.8cqw] pt-[1.8cqw]"
        aria-label="Instagram grid güvenli alanı"
      >
        <header className="flex min-h-0 items-start justify-between">
          <div className="flex items-center gap-[1.15cqw]">
            <span className="grid size-[4.6cqw] place-items-center rounded-[1cqw] bg-white p-[0.65cqw] shadow-[0_0_26px_rgba(255,255,255,0.22)]">
              <Image
                src="/logo.svg"
                alt="CENTER GSM"
                width={168}
                height={48}
                className="h-auto w-full object-contain"
              />
            </span>
            <div>
              <p className="text-[1.85cqw] font-black leading-none tracking-[-0.04em] text-white">
                CENTER <span className="text-red-500">GSM</span>
              </p>
              <p className="mt-[0.45cqw] text-[0.72cqw] font-bold uppercase tracking-[0.28em] text-zinc-400">
                Teknolojinin Merkezi
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-[0.8cqw] rounded-[1cqw] border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/20 to-orange-400/10 px-[1.35cqw] py-[0.75cqw] text-[1.3cqw] font-black text-white shadow-[0_0_24px_rgba(217,70,239,0.2)]">
            <Instagram
              className="size-[1.7cqw] text-fuchsia-300"
              aria-hidden="true"
            />
            @offgamersofficial
          </span>
        </header>

        <div className="grid min-h-0 grid-cols-[55fr_45fr] gap-[1.8cqw]">
          <section
            className="flex min-h-0 flex-col"
            aria-label="Ürün bilgileri"
          >
            <div className="shrink-0 pb-[0.8cqw]">
              <p className="text-[1.6cqw] font-black uppercase tracking-[0.22em] text-fuchsia-300 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)]">
                {product.brand.name}
              </p>
              <h2
                className={cn(
                  "mt-[0.35cqw] line-clamp-2 bg-gradient-to-r from-fuchsia-200 via-white to-blue-200 bg-clip-text font-black leading-[0.94] tracking-[-0.055em] text-transparent drop-shadow-[0_0_18px_rgba(217,70,239,0.55)]",
                  productNameSize,
                )}
              >
                {productName}
              </h2>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="absolute left-1/2 top-[56%] size-[71%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/25 bg-fuchsia-500/[0.04] shadow-[0_0_55px_rgba(59,130,246,0.22),inset_0_0_48px_rgba(217,70,239,0.14)]" />
              <div className="absolute bottom-[4%] left-1/2 h-[7.5%] w-[76%] -translate-x-1/2 rounded-[50%] border border-fuchsia-300/70 bg-blue-500/25 shadow-[0_0_10px_#e879f9,0_0_28px_#2563eb,inset_0_0_18px_#d946ef]" />
              <div className="absolute bottom-[6.2%] left-1/2 h-[3.5%] w-[63%] -translate-x-1/2 rounded-[50%] border border-cyan-200/60 shadow-[0_0_18px_#22d3ee]" />
              {cutoutImage ? (
                // Supabase Storage images are intentionally rendered from their saved URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cutoutImage}
                  alt={productName}
                  className="relative z-10 size-full object-contain p-[1%] drop-shadow-[0_2.6cqw_2.8cqw_rgba(0,0,0,0.72)]"
                />
              ) : (
                <ImageIcon
                  className="absolute left-1/2 top-1/2 size-[7cqw] -translate-x-1/2 -translate-y-1/2 text-white/20"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="flex min-h-[5.6cqw] items-end justify-between gap-[1.4cqw] pb-[0.7cqw] pt-[0.7cqw]">
              <div>
                <p className="mb-[0.55cqw] text-[0.9cqw] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Depolama seçenekleri
                </p>
                {storageOptions.length ? (
                  <div className="flex flex-wrap gap-[0.45cqw]">
                    {storageOptions.map(([key, variant]) => (
                      <span
                        key={key}
                        className={cn(
                          "grid min-w-[4.6cqw] place-items-center rounded-[0.65cqw] border px-[0.9cqw] py-[0.65cqw] text-[1.3cqw] font-black",
                          key === selectedStorageKey
                            ? "border-fuchsia-300 bg-fuchsia-500/25 text-white shadow-[0_0_16px_rgba(217,70,239,0.65),inset_0_0_12px_rgba(217,70,239,0.22)]"
                            : "border-blue-400/40 bg-black/35 text-zinc-400",
                        )}
                      >
                        {variant.storage_value}
                        {variant.storage_unit}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <p className="mb-[0.65cqw] text-[0.9cqw] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Renkler
                </p>
                {activeColors.length ? (
                  <div
                    className="flex flex-nowrap items-center justify-end gap-[0.55cqw] overflow-hidden"
                    aria-label="Renk seçenekleri"
                  >
                    {activeColors.map((color) => (
                      <span
                        key={color.id}
                        className="size-[1.75cqw] rounded-full border-[0.16cqw] border-white/70 shadow-[0_0_10px_rgba(255,255,255,0.18)]"
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
            className="flex min-h-0 flex-col pb-[1cqw]"
            aria-label="Ödeme seçenekleri"
          >
            <div className="flex items-center justify-between">
              <p className="text-[2cqw] font-black uppercase tracking-[-0.02em] text-white">
                3 farklı{" "}
                <span className="text-fuchsia-300">ödeme seçeneği</span>
              </p>
              <Sparkles
                className="size-[1.8cqw] text-amber-300"
                strokeWidth={1.4}
                aria-hidden="true"
              />
            </div>
            <div className="mt-[0.65cqw] h-px bg-gradient-to-r from-fuchsia-400 via-blue-400 to-transparent shadow-[0_0_8px_#d946ef]" />
            <div className="mt-[1cqw] grid min-h-0 flex-1 grid-rows-3 gap-[0.85cqw]">
              <PaymentCard
                icon={ShoppingBag}
                eyebrow="Peşin fiyat"
                accent="pink"
              >
                <div className="flex min-w-0 items-end justify-between gap-[1cqw]">
                  <div className="min-w-0">
                    {oldPrice ? (
                      <p className="text-[1.55cqw] font-semibold text-zinc-400 line-through">
                        {formatCurrency(oldPrice)}
                      </p>
                    ) : null}
                    <p className="whitespace-nowrap bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-[4.3cqw] font-black leading-none tracking-[-0.065em] text-transparent drop-shadow-[0_0_16px_rgba(251,191,36,0.3)]">
                      {formatCurrency(price)}
                    </p>
                  </div>
                  {discountRate ? (
                    <span className="shrink-0 rounded-[0.7cqw] border border-amber-200/50 bg-amber-400 px-[0.9cqw] py-[0.5cqw] text-[1.3cqw] font-black text-zinc-950 shadow-[0_0_18px_rgba(251,191,36,0.45)]">
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
                <p className="text-[2.8cqw] font-black leading-[1.06] text-white">
                  {hasInstallments
                    ? `${installmentCount} aya varan taksit imkânı`
                    : "Bu ürün için taksit seçeneği bulunmuyor"}
                </p>
                {hasInstallments ? (
                  <p className="mt-[0.75cqw] text-[2.2cqw] font-bold text-blue-200">
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
                <p className="max-w-[96%] text-[2.05cqw] font-bold leading-[1.18] text-white">
                  Uygun ödeme seçenekleri için mağazamızla iletişime geçin.
                </p>
              </PaymentCard>
            </div>
          </section>
        </div>

        <section
          className="grid grid-cols-4 gap-[0.45cqw] rounded-[1.5cqw] border border-fuchsia-400/35 bg-gradient-to-r from-fuchsia-500/[0.09] via-blue-500/[0.07] to-fuchsia-500/[0.09] px-[0.65cqw] py-[1.15cqw] shadow-[0_0_24px_rgba(217,70,239,0.18),inset_0_0_24px_rgba(59,130,246,0.08)]"
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

        <footer className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[1.5cqw] pt-[1.2cqw]">
          <div className="flex min-w-0 items-center gap-[1.2cqw]">
            <span className="rounded-[0.8cqw] border border-fuchsia-300 bg-white p-[0.5cqw] shadow-[0_0_20px_rgba(232,121,249,0.45)]">
              <QRCodeSVG value={productUrl} size={74} level="M" />
            </span>
            <div className="text-[1cqw] font-semibold leading-[1.35] text-zinc-400">
              <p className="font-black uppercase tracking-[0.08em] text-white">
                Ürünü keşfet
              </p>
              <p>{product.category.name}</p>
              <p>
                {availableStock > 0
                  ? "Stokta"
                  : "Stok bilgisi için iletişime geçin"}
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[2.5cqw] font-black leading-none tracking-[-0.04em] text-white">
              CENTER <span className="text-red-500">GSM</span>
            </p>
            <p className="mt-[0.5cqw] text-[1cqw] font-bold uppercase tracking-[0.28em] text-zinc-400">
              Teknolojinin Merkezi
            </p>
            <p className="mt-[0.4cqw] text-[1.05cqw] font-black uppercase tracking-[0.32em] text-fuchsia-300">
              OFFGAMERS
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-[1.2cqw] justify-self-end rounded-[1.2cqw] border border-fuchsia-400/55 bg-fuchsia-500/10 px-[2cqw] py-[1cqw] text-right shadow-[0_0_24px_rgba(217,70,239,0.22),inset_0_0_18px_rgba(217,70,239,0.08)]">
            <div>
              <p className="text-[1.6cqw] font-black uppercase text-fuchsia-300">
                Hemen İncele
              </p>
              <p className="max-w-[26cqw] truncate text-[1.45cqw] font-semibold text-white">
                {domain}
              </p>
            </div>
            <span className="text-[2.8cqw] font-light leading-none text-fuchsia-300">
              ›
            </span>
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
    pink: "border-amber-300/65 before:bg-amber-300 text-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.17),inset_0_0_20px_rgba(251,191,36,0.05)]",
    blue: "border-blue-400/65 before:bg-blue-400 text-blue-300 shadow-[0_0_22px_rgba(59,130,246,0.2),inset_0_0_20px_rgba(59,130,246,0.06)]",
    green:
      "border-lime-400/65 before:bg-lime-400 text-lime-300 shadow-[0_0_22px_rgba(163,230,53,0.17),inset_0_0_20px_rgba(163,230,53,0.05)]",
  }[accent];
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col justify-center overflow-hidden rounded-[1.45cqw] border bg-black/55 px-[1.5cqw] py-[1.15cqw] backdrop-blur-xl before:absolute before:inset-y-[12%] before:left-0 before:w-[0.28cqw] before:rounded-full after:absolute after:-right-[8%] after:-top-[28%] after:size-[42%] after:rounded-full after:bg-current after:opacity-[0.06] after:blur-[1.8cqw]",
        styles,
      )}
    >
      <div className="flex items-center gap-[0.7cqw]">
        <span className="border-current/50 bg-current/10 grid size-[3.2cqw] place-items-center rounded-full border shadow-[0_0_14px_currentColor]">
          <Icon
            className="size-[1.75cqw]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>
        <p
          className={cn(
            "text-[1.65cqw] font-black uppercase tracking-[0.025em]",
            accent === "green" &&
              "whitespace-nowrap text-[1.45cqw] leading-none tracking-[-0.01em]",
          )}
        >
          {eyebrow}
        </p>
      </div>
      <div className="relative z-10 mt-[1cqw] text-white">{children}</div>
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
    <div className="relative flex min-w-0 items-center gap-[0.75cqw] px-[0.75cqw] after:absolute after:inset-y-[12%] after:-right-[0.2cqw] after:w-px after:bg-white/10 last:after:hidden">
      <span
        className={cn(
          "absolute inset-y-[8%] left-0 w-[0.18cqw] rounded-full shadow-[0_0_10px_currentColor]",
          color.split(" ")[0],
        )}
      />
      <Icon
        className={cn(
          "size-[3.15cqw] shrink-0 drop-shadow-[0_0_8px_currentColor]",
          color.split(" ")[1],
        )}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="truncate text-[1.9cqw] font-black text-white">{title}</p>
        <p className="truncate text-[1.42cqw] font-medium text-zinc-300">
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
