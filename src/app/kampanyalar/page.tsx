import Link from "next/link";
import { ChevronRight, Home, Percent } from "lucide-react";

import { Pagination } from "@/components/catalog/pagination";
import { ProductCard } from "@/components/catalog/product-card";
import {
  CatalogEmptyState,
  CatalogErrorState,
} from "@/components/catalog/catalog-states";
import { Container } from "@/components/ui/container";
import { getCampaignProducts } from "@/lib/catalog/data";
import type { CatalogSearchParams } from "@/lib/catalog/params";

export const revalidate = 300;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const pageParam = Array.isArray(params.sayfa)
    ? params.sayfa[0]
    : params.sayfa;
  const page = Math.max(1, Number(pageParam) || 1);
  const result = await getCampaignProducts({ page, pageSize: 20 });
  const totalPages = Math.ceil(result.total / result.pageSize);

  return (
    <main className="tech-atmosphere min-h-screen pb-12 pt-3 sm:pb-16 sm:pt-7">
      <Container>
        <nav aria-label="Sayfa yolu">
          <ol className="flex items-center gap-2 text-xs text-muted">
            <li>
              <Link
                href="/"
                aria-label="Ana sayfa"
                className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Home className="size-3.5" aria-hidden="true" />
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li className="font-semibold text-foreground" aria-current="page">
              Kampanyalar
            </li>
          </ol>
        </nav>

        <section className="mt-6 overflow-hidden rounded-3xl bg-zinc-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-red-950/30 sm:size-12">
              <Percent className="size-5 sm:size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400 sm:text-xs">
                Güncel fırsatlar
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
                Kampanyalı Ürünler
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-300 sm:text-base">
                Güncel satış fiyatında %18 ve üzeri indirim bulunan aktif
                ürünleri tek sayfada keşfedin.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-7 flex items-end justify-between gap-4 sm:mt-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
              Otomatik güncellenir
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
              İndirimli teknoloji ürünleri
            </h2>
          </div>
          {!result.error ? (
            <p className="shrink-0 text-sm font-semibold text-muted">
              {result.total} ürün
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          {result.error ? (
            <CatalogErrorState />
          ) : result.data.length === 0 ? (
            <CatalogEmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)] md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {result.data.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compactMobile
                  denseMobile
                />
              ))}
            </div>
          )}

          {!result.error ? (
            <Pagination
              page={result.page}
              totalPages={totalPages}
              basePath="/kampanyalar"
              params={params}
            />
          ) : null}
        </div>
      </Container>
    </main>
  );
}
