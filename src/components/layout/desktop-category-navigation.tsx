"use client";

import Link from "next/link";
import { ChevronDown, Grid2X2, Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Divider } from "@/components/ui/divider";
import type { CatalogTaxonomy } from "@/lib/catalog/types";
import { normalizeTaxonomySlug } from "@/lib/catalog/taxonomy-slug";

type OpenMenu = "all" | "more" | null;

export function DesktopCategoryNavigation({
  categories,
}: {
  categories: CatalogTaxonomy[];
}) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { primaryCategories, remainingCategories } = useMemo(() => {
    const selected = categories.filter((category) => category.show_in_header);
    const primary = (selected.length ? selected : categories).slice(0, 7);
    const primaryIds = new Set(primary.map((category) => category.id));

    return {
      primaryCategories: primary,
      remainingCategories: categories.filter(
        (category) => !primaryIds.has(category.id),
      ),
    };
  }, [categories]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const categoryLink = (category: CatalogTaxonomy) => (
    <Link
      key={category.id}
      href={`/kategori/${normalizeTaxonomySlug(category.slug)}`}
      onClick={() => setOpenMenu(null)}
      className="rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-red-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {category.name}
    </Link>
  );

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1 items-center gap-5">
      <button
        type="button"
        aria-expanded={openMenu === "all"}
        aria-controls="all-categories-menu"
        onClick={() =>
          setOpenMenu((current) => (current === "all" ? null : "all"))
        }
        className="inline-flex shrink-0 items-center gap-2 rounded-sm text-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Menu className="size-4" aria-hidden="true" />
        Tüm Kategoriler
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>
      <Divider orientation="vertical" className="h-5" />

      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        {primaryCategories.map((category) => (
          <Link
            key={category.id}
            href={`/kategori/${normalizeTaxonomySlug(category.slug)}`}
            className="min-w-0 truncate rounded-sm text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {category.name}
          </Link>
        ))}

        {remainingCategories.length ? (
          <button
            type="button"
            aria-expanded={openMenu === "more"}
            aria-controls="more-categories-menu"
            onClick={() =>
              setOpenMenu((current) => (current === "more" ? null : "more"))
            }
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Daha Fazla
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}

        <Link
          href="/#deals"
          className="shrink-0 rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-red-100"
        >
          Kampanyalar
        </Link>
      </div>

      {openMenu === "all" ? (
        <div
          id="all-categories-menu"
          className="absolute inset-x-0 top-full border-t border-zinc-100 bg-white shadow-2xl"
        >
          <div className="mx-auto grid w-full max-w-7xl grid-cols-[240px_1fr] gap-8 px-6 py-7 lg:px-8">
            <div className="rounded-2xl bg-zinc-950 p-5 text-white">
              <Grid2X2 className="size-7 text-primary" aria-hidden="true" />
              <p className="mt-4 text-lg font-black">Tüm kategoriler</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Aradığınız teknoloji kategorisine hızlıca ulaşın.
              </p>
              <Link
                href="/urunler"
                onClick={() => setOpenMenu(null)}
                className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-zinc-950"
              >
                Tüm ürünleri görüntüle
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-1 xl:grid-cols-4">
              {categories.map(categoryLink)}
            </div>
          </div>
        </div>
      ) : null}

      {openMenu === "more" ? (
        <div
          id="more-categories-menu"
          className="absolute right-[max(1.5rem,calc((100vw-80rem)/2))] top-full w-72 rounded-b-2xl border border-zinc-100 bg-white p-3 shadow-2xl"
        >
          <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            Diğer kategoriler
          </p>
          <div className="grid">{remainingCategories.map(categoryLink)}</div>
        </div>
      ) : null}
    </div>
  );
}
