import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
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

export function Hero({ product }: { product?: CatalogProduct }) {
  const productHref = product ? productPath(product.slug) : "/urunler";
  const stockLabel =
    product?.stockStatus === "limited" ? "Sınırlı stok" : "Stokta";

  return (
    <section aria-labelledby="home-hero-title" className="py-2.5 sm:py-4">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#07090f] text-white shadow-[0_28px_80px_-44px_rgba(0,0,0,0.9)] sm:rounded-[2rem]">
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

          <div className="grid items-center gap-9 px-6 pb-8 pt-9 sm:px-10 sm:pb-10 sm:pt-11 lg:min-h-[31rem] lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-14 lg:py-12 xl:px-16">
            <div className="max-w-[38rem]">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-zinc-200 backdrop-blur-sm">
                <Sparkles
                  className="size-3.5 text-red-400"
                  aria-hidden="true"
                />
                Seçkin teknoloji, güvenli alışveriş
              </div>

              <h1
                id="home-hero-title"
                className="text-balance text-[2.45rem] font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-[4.35rem]"
              >
                Teknolojiye
                <span className="mt-1 block bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                  güvenle ulaşın.
                </span>
              </h1>

              <p className="mt-6 max-w-[34rem] text-pretty text-sm leading-7 text-zinc-300 sm:text-base">
                Orijinal ürünler, avantajlı ödeme seçenekleri ve satış sonrası
                destekle teknolojiyi güvenle keşfedin.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
              <article className="relative overflow-hidden rounded-[1.45rem] border border-white/70 bg-white text-zinc-950 shadow-[0_28px_80px_-32px_rgba(0,0,0,0.9)]">
                {product ? (
                  <div className="grid min-h-[22rem] sm:grid-cols-[1.05fr_0.95fr]">
                    <div className="relative min-h-[18rem] overflow-hidden bg-white sm:min-h-full">
                      <div className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-zinc-700 shadow-sm backdrop-blur">
                        <span className="size-1.5 rounded-full bg-red-600" />
                        Öne çıkan ürün
                      </div>
                      <ProductVisual
                        product={product}
                        performancePreset="hero"
                        enlarged
                      />
                    </div>

                    <div className="flex flex-col justify-center border-t border-zinc-100 bg-white p-6 sm:border-l sm:border-t-0 sm:p-7">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-red-600">
                          {product.brand}
                        </span>
                        {product.stockStatus !== "out-of-stock" ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-bold text-emerald-700">
                            {stockLabel}
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.68rem] font-bold text-zinc-600">
                            Tükendi
                          </span>
                        )}
                      </div>

                      <h2 className="line-clamp-3 text-xl font-black leading-tight tracking-[-0.025em] sm:text-2xl">
                        {productDisplayName(product)}
                      </h2>

                      <div className="mt-7">
                        {product.previousPrice &&
                        product.previousPrice > product.price ? (
                          <p className="text-xs font-semibold text-zinc-400 line-through">
                            {formatCurrency(product.previousPrice)}
                          </p>
                        ) : null}
                        <p className="mt-1 text-3xl font-black tracking-[-0.04em]">
                          {formatCurrency(product.price)}
                        </p>
                      </div>

                      {product.showInstallments &&
                      product.installmentCount > 1 ? (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-600">
                          <span className="font-black text-zinc-950">
                            {product.installmentCount} ay
                          </span>{" "}
                          × {formatCurrency(product.monthlyInstallment)}
                        </div>
                      ) : null}

                      <Link
                        href={productHref}
                        className="storefront-action mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-red-600"
                      >
                        Ürünü incele
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[22rem] place-items-center bg-white p-8 text-center">
                    <div>
                      <Sparkles
                        className="mx-auto size-8 text-red-600"
                        aria-hidden="true"
                      />
                      <h2 className="mt-4 text-2xl font-black">
                        Teknolojiyi keşfedin
                      </h2>
                      <p className="mt-2 text-sm text-zinc-500">
                        Size uygun ürünleri ve ödeme seçeneklerini inceleyin.
                      </p>
                    </div>
                  </div>
                )}
              </article>
            </div>
          </div>

          <div className="grid border-t border-white/10 bg-white/[0.035] sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex items-center gap-3 border-white/10 px-5 py-4 lg:border-l lg:first:border-l-0 sm:[&:nth-child(even)]:border-l"
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
