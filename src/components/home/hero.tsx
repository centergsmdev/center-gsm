import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { Container } from "@/components/ui/container";
import { productPath } from "@/lib/catalog/product-url";
import { productDisplayName } from "@/lib/catalog/variants";
import { formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/product";

const trustItems = [
  { icon: BadgeCheck, label: "Orijinal ürün", detail: "Distribütör güvencesi" },
  {
    icon: ShieldCheck,
    label: "Güvenli alışveriş",
    detail: "Korunan ödeme altyapısı",
  },
  { icon: Truck, label: "Hızlı teslimat", detail: "Türkiye'nin her yerine" },
  {
    icon: Headphones,
    label: "Satış sonrası destek",
    detail: "Her adımda yanınızda",
  },
] as const;

function ProductImage({ product }: { product: CatalogProduct }) {
  return product.mainImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.mainImageUrl}
      alt={`${product.brand} ${product.model}`}
      width={560}
      height={560}
      sizes="(max-width: 1023px) 96px, 340px"
      loading="eager"
      decoding="async"
      fetchPriority="high"
      className="absolute inset-0 size-full object-contain object-center p-1 mix-blend-darken drop-shadow-[0_24px_30px_rgba(0,0,0,0.3)] lg:p-8"
    />
  ) : (
    <div className="grid size-full place-items-center">
      <Sparkles className="size-12 text-red-400" aria-hidden="true" />
    </div>
  );
}

export function Hero({ product }: { product?: CatalogProduct }) {
  const productHref = product ? productPath(product.slug) : "/urunler";
  const stockLabel =
    product?.stockStatus === "limited" ? "Sınırlı stok" : "Stokta";

  return (
    <section
      aria-label="CENTER GSM ana vitrini"
      className="overflow-x-clip py-2 sm:py-4"
    >
      <Container>
        <div className="relative isolate w-full min-w-0 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07090f] text-white shadow-[0_28px_80px_-44px_rgba(0,0,0,0.9)] sm:rounded-[2rem]">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
          />
          <div
            aria-hidden="true"
            className="absolute -left-32 top-12 -z-10 size-80 rounded-full bg-red-600/20 blur-[100px]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-20 top-0 -z-10 size-[26rem] rounded-full bg-blue-700/15 blur-[120px]"
          />

          <div className="px-4 pb-4 pt-5 sm:px-6 sm:pb-6 lg:hidden">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[0.64rem] font-bold text-zinc-200">
              <Sparkles className="size-3 text-red-400" aria-hidden="true" />
              Seçkin teknoloji, güvenli alışveriş
            </div>

            <h1 className="mt-3 text-[2rem] font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl">
              Teknolojiye
              <span className="block">güvenle ulaşın.</span>
            </h1>
            <p className="mt-2.5 max-w-lg text-xs leading-5 text-zinc-400 sm:text-sm">
              Orijinal ürünleri avantajlı ödeme seçenekleriyle keşfedin.
            </p>

            {product ? (
              <Link
                href={productHref}
                className="storefront-action mt-4 grid min-h-[7rem] grid-cols-[5.5rem_1fr] gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:grid-cols-[7rem_1fr]"
              >
                <div className="relative min-h-[5.5rem] overflow-hidden rounded-xl bg-gradient-to-br from-[#d8dbe2] to-[#aeb4c0] sm:min-h-[7rem]">
                  <ProductImage product={product} />
                </div>
                <div className="flex min-w-0 flex-col justify-center py-0.5 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[0.58rem] font-black uppercase tracking-[0.18em] text-red-400">
                      {product.brand}
                    </span>
                    {product.stockStatus !== "out-of-stock" ? (
                      <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-[0.58rem] font-bold text-emerald-300">
                        {stockLabel}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1.5 line-clamp-2 text-sm font-black leading-[1.15] tracking-[-0.02em] text-white sm:text-base">
                    {productDisplayName(product)}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                    <span className="text-xl font-black tracking-[-0.04em] text-white">
                      {formatCurrency(product.price)}
                    </span>
                    {product.showInstallments &&
                    product.installmentCount > 1 ? (
                      <span className="pb-0.5 text-[0.62rem] font-semibold text-zinc-400">
                        {product.installmentCount} ay ×{" "}
                        {formatCurrency(product.monthlyInstallment)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Link
                href={productHref}
                className="storefront-action inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-red-600 px-3 text-xs font-bold text-white shadow-[0_12px_28px_-16px_rgba(220,38,38,0.9)]"
              >
                Ürünü İncele
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/urunler"
                className="storefront-action inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-3 text-xs font-bold text-white"
              >
                Tüm Ürünler
              </Link>
            </div>

            <div className="mt-3 flex items-center justify-center gap-4 text-[0.6rem] font-semibold text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck
                  className="size-3.5 text-red-400"
                  aria-hidden="true"
                />
                Orijinal ürün
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="size-3.5 text-emerald-400"
                  aria-hidden="true"
                />
                Güvenli alışveriş
              </span>
            </div>
          </div>

          <div className="hidden min-h-[31rem] grid-cols-[0.92fr_1.08fr] items-center gap-14 px-14 py-12 lg:grid xl:px-16">
            <div className="max-w-[38rem]">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-zinc-200 backdrop-blur-sm">
                <Sparkles
                  className="size-3.5 text-red-400"
                  aria-hidden="true"
                />
                Seçkin teknoloji, güvenli alışveriş
              </div>

              <h1 className="text-balance text-[4.35rem] font-black leading-[0.98] tracking-[-0.05em]">
                Teknolojiye
                <span className="mt-1 block bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                  güvenle ulaşın.
                </span>
              </h1>

              <p className="mt-6 max-w-[34rem] text-pretty text-base leading-7 text-zinc-300">
                Orijinal ürünler, avantajlı ödeme seçenekleri ve satış sonrası
                destekle teknolojiyi güvenle keşfedin.
              </p>

              <div className="mt-8 flex gap-3">
                <Link
                  href="/urunler"
                  className="storefront-action inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 text-sm font-bold text-white shadow-[0_14px_34px_-16px_rgba(220,38,38,0.9)] transition hover:bg-red-500"
                >
                  Ürünleri Keşfet
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href={productHref}
                  className="storefront-action inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/[0.1]"
                >
                  Elden Taksiti İncele
                </Link>
              </div>

              <div className="mt-7 flex items-center gap-2 text-xs font-medium text-zinc-400">
                <ShieldCheck
                  className="size-4 text-emerald-400"
                  aria-hidden="true"
                />
                Kişisel bilgileriniz güvenli altyapıyla korunur.
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[43rem]">
              <div
                aria-hidden="true"
                className="absolute inset-x-10 bottom-[-1.2rem] h-12 rounded-[50%] bg-black/70 blur-2xl"
              />
              <article className="relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-white/[0.055] text-white shadow-[0_28px_80px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                {product ? (
                  <div className="grid min-h-[22rem] grid-cols-[1.05fr_0.95fr]">
                    <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-[#d8dbe2] via-[#c4c8d1] to-[#9ba2af]">
                      <div className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-zinc-200 shadow-sm backdrop-blur-md">
                        <span className="size-1.5 rounded-full bg-red-500" />
                        Öne çıkan ürün
                      </div>
                      <ProductImage product={product} />
                    </div>

                    <div className="flex flex-col justify-center border-l border-white/10 bg-black/10 p-7">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-red-400">
                          {product.brand}
                        </span>
                        {product.stockStatus !== "out-of-stock" ? (
                          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[0.68rem] font-bold text-emerald-300">
                            {stockLabel}
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[0.68rem] font-bold text-zinc-400">
                            Tükendi
                          </span>
                        )}
                      </div>

                      <h2 className="line-clamp-3 text-2xl font-black leading-tight tracking-[-0.025em] text-white">
                        {productDisplayName(product)}
                      </h2>

                      <div className="mt-7">
                        {product.previousPrice &&
                        product.previousPrice > product.price ? (
                          <p className="text-xs font-semibold text-zinc-500 line-through">
                            {formatCurrency(product.previousPrice)}
                          </p>
                        ) : null}
                        <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-white">
                          {formatCurrency(product.price)}
                        </p>
                      </div>

                      {product.showInstallments &&
                      product.installmentCount > 1 ? (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-xs font-semibold text-zinc-400">
                          <span className="font-black text-white">
                            {product.installmentCount} ay
                          </span>{" "}
                          × {formatCurrency(product.monthlyInstallment)}
                        </div>
                      ) : null}

                      <Link
                        href={productHref}
                        className="storefront-action mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-500"
                      >
                        Ürünü incele
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[22rem] place-items-center p-8 text-center">
                    <div>
                      <Sparkles
                        className="mx-auto size-8 text-red-400"
                        aria-hidden="true"
                      />
                      <h2 className="mt-4 text-2xl font-black">
                        Teknolojiyi keşfedin
                      </h2>
                    </div>
                  </div>
                )}
              </article>
            </div>
          </div>

          <div className="hidden border-t border-white/10 bg-white/[0.035] lg:grid lg:grid-cols-4">
            {trustItems.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex items-center gap-3 border-l border-white/10 px-5 py-4 first:border-l-0"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-red-400">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{label}</p>
                  <p className="mt-0.5 text-[0.68rem] text-zinc-500">
                    {detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
