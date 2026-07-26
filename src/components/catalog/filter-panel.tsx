import Link from "next/link";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import type { BrandTaxonomy, CatalogTaxonomy } from "@/lib/catalog/types";
import type { CatalogSearchParams } from "@/lib/catalog/params";

export function FilterPanel({
  categories,
  brands,
  params,
  basePath,
}: {
  categories: CatalogTaxonomy[];
  brands: BrandTaxonomy[];
  params: CatalogSearchParams;
  basePath: string;
}) {
  return (
    <aside
      id="catalog-filters"
      aria-label="Ürün filtreleri"
      className="w-full shrink-0 lg:w-60 xl:w-64"
    >
      <details className="rounded-lg border border-border bg-white shadow-xs lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-bold">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filtreler
          </span>
          <ChevronDown className="size-4" />
        </summary>
        <div className="border-t border-border p-4">
          <FilterForm {...{ categories, brands, params, basePath }} />
        </div>
      </details>
      <div className="hidden lg:sticky lg:top-44 lg:block lg:rounded-lg lg:border lg:border-border lg:bg-white lg:p-5 lg:shadow-xs">
        <FilterForm {...{ categories, brands, params, basePath }} />
      </div>
    </aside>
  );
}

function FilterForm({
  categories,
  brands,
  params,
  basePath,
}: {
  categories: CatalogTaxonomy[];
  brands: BrandTaxonomy[];
  params: CatalogSearchParams;
  basePath: string;
}) {
  const selectedCategories = new Set(
    Array.isArray(params.kategori)
      ? params.kategori
      : params.kategori
        ? [params.kategori]
        : [],
  );
  const selectedBrands = new Set(
    Array.isArray(params.marka)
      ? params.marka
      : params.marka
        ? [params.marka]
        : [],
  );
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return (
    <form action={basePath} method="get">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Filtreler</h2>
        <Link
          href={query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath}
          className="text-xs font-semibold text-primary hover:text-primary-hover"
        >
          Temizle
        </Link>
      </div>
      {query ? <input type="hidden" name="q" value={query} /> : null}
      <input
        type="hidden"
        name="sirala"
        value={
          Array.isArray(params.sirala)
            ? params.sirala[0]
            : (params.sirala ?? "popular")
        }
      />
      <Divider className="my-5" />
      <FilterGroup title="Fiyat Aralığı">
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">En düşük fiyat</span>
            <Input
              name="minFiyat"
              inputMode="numeric"
              placeholder="Min"
              defaultValue={
                Array.isArray(params.minFiyat)
                  ? params.minFiyat[0]
                  : params.minFiyat
              }
              className="h-10 px-3"
            />
          </label>
          <label>
            <span className="sr-only">En yüksek fiyat</span>
            <Input
              name="maxFiyat"
              inputMode="numeric"
              placeholder="Maks"
              defaultValue={
                Array.isArray(params.maxFiyat)
                  ? params.maxFiyat[0]
                  : params.maxFiyat
              }
              className="h-10 px-3"
            />
          </label>
        </div>
      </FilterGroup>
      <FilterGroup title="Kategori">
        <Options
          name="kategori"
          options={categories}
          selected={selectedCategories}
        />
      </FilterGroup>
      <FilterGroup title="Marka">
        <Options name="marka" options={brands} selected={selectedBrands} />
      </FilterGroup>
      <FilterGroup title="Durum">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-600">
          <input
            name="stok"
            value="var"
            type="checkbox"
            defaultChecked={params.stok === "var"}
            className="size-4 accent-red-600"
          />
          Stokta olanlar
        </label>
        <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-zinc-600">
          <input
            name="indirim"
            value="var"
            type="checkbox"
            defaultChecked={params.indirim === "var"}
            className="size-4 accent-red-600"
          />
          İndirimli ürünler
        </label>
      </FilterGroup>
      <Button type="submit" className="mt-5 w-full">
        Filtreleri Uygula
      </Button>
    </form>
  );
}
function Options({
  name,
  options,
  selected,
}: {
  name: string;
  options: { id: string; name: string; slug: string }[];
  selected: Set<string>;
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-3 text-sm text-zinc-600 hover:text-foreground"
        >
          <input
            name={name}
            value={option.slug}
            type="checkbox"
            defaultChecked={selected.has(option.slug)}
            className="size-4 accent-red-600"
          />
          {option.name}
        </label>
      ))}
    </div>
  );
}
function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border py-5 first:pt-0 last:border-0 last:pb-0">
      <h3 className="mb-4 text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}
