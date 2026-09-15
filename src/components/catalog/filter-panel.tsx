"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { Check, SlidersHorizontal, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BrandTaxonomy, CatalogTaxonomy } from "@/lib/catalog/types";
import type { CatalogSearchParams } from "@/lib/catalog/params";

export function FilterPanel({
  categories,
  brands,
  params,
  basePath,
  compactMobile = false,
}: {
  categories: CatalogTaxonomy[];
  brands: BrandTaxonomy[];
  params: CatalogSearchParams;
  basePath: string;
  compactMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragControls = useDragControls();
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(params),
    [params],
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <aside
      id="catalog-filters"
      aria-label="Ürün filtreleri"
      className="w-full shrink-0 lg:w-60 xl:w-64"
    >
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-catalog-filters"
          onClick={() => setOpen(true)}
          className={`flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white text-sm font-black text-zinc-950 shadow-[0_8px_28px_rgba(15,23,42,0.07)] transition-all active:scale-[0.99] ${
            compactMobile ? "p-3" : "p-4"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-white">
              <SlidersHorizontal className="size-4" />
            </span>
            Filtreler
          </span>
          {activeFilterCount > 0 ? (
            <span className="grid min-w-7 place-items-center rounded-full bg-primary px-2 py-1 text-[11px] font-black text-white">
              {activeFilterCount}
            </span>
          ) : (
            <span className="text-xs font-semibold text-zinc-400">
              Seçenekler
            </span>
          )}
        </button>

        {typeof document !== "undefined"
          ? createPortal(
              <AnimatePresence>
                {open ? (
                  <div className="fixed inset-0 z-modal lg:hidden">
                    <motion.button
                      type="button"
                      aria-label="Filtreleri kapat"
                      className="absolute inset-0 cursor-default bg-zinc-950/45 backdrop-blur-[2px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      onClick={() => setOpen(false)}
                    />
                    <motion.section
                      id="mobile-catalog-filters"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Ürün filtreleri"
                      className="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] flex-col overflow-hidden rounded-t-[30px] border-t border-white/20 bg-zinc-50 shadow-[0_-24px_80px_rgba(0,0,0,0.24)]"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      drag="y"
                      dragControls={dragControls}
                      dragListener={false}
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={{ top: 0, bottom: 0.45 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 110 || info.velocity.y > 650) {
                          setOpen(false);
                        }
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 38,
                      }}
                    >
                      <div
                        className="relative shrink-0 cursor-grab touch-none overflow-hidden bg-zinc-950 px-5 pb-6 pt-3 text-white active:cursor-grabbing"
                        onPointerDown={(event) => dragControls.start(event)}
                      >
                        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/30" />
                        <div className="absolute -right-10 -top-16 size-36 rounded-full bg-red-600/25 blur-3xl" />
                        <div className="relative flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                              <SlidersHorizontal className="size-5" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black leading-tight">
                                  Ürünleri Filtrele
                                </h2>
                                {activeFilterCount > 0 ? (
                                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black">
                                    {activeFilterCount} aktif
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs leading-5 text-zinc-400">
                                Aradığınız ürüne daha hızlı ulaşın.
                              </p>
                            </div>
                          </div>
                          <button
                            ref={closeButtonRef}
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => setOpen(false)}
                            aria-label="Filtreleri kapat"
                            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <X className="size-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        <FilterForm
                          {...{ categories, brands, params, basePath }}
                          mobile
                        />
                      </div>
                    </motion.section>
                  </div>
                ) : null}
              </AnimatePresence>,
              document.body,
            )
          : null}
      </div>
      <div className="hidden lg:sticky lg:top-44 lg:block lg:max-h-[calc(100vh-12rem)] lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-zinc-200 lg:bg-white lg:shadow-[0_18px_55px_rgba(15,23,42,0.09)]">
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
  mobile = false,
}: {
  categories: CatalogTaxonomy[];
  brands: BrandTaxonomy[];
  params: CatalogSearchParams;
  basePath: string;
  mobile?: boolean;
}) {
  const selectedCategories = new Set(
    Array.isArray(params.kategori)
      ? params.kategori
      : params.kategori
        ? [params.kategori]
        : [],
  );
  const brandParam = params.brand ?? params.marka;
  const selectedBrands = new Set(
    Array.isArray(brandParam) ? brandParam : brandParam ? [brandParam] : [],
  );
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return (
    <form
      action={basePath}
      method="get"
      className={
        mobile ? "space-y-3" : "flex max-h-[calc(100vh-12rem)] min-h-0 flex-col"
      }
    >
      {!mobile ? (
        <div className="relative shrink-0 overflow-hidden bg-zinc-950 px-5 py-5 text-white">
          <div className="absolute -right-8 -top-12 size-28 rounded-full bg-red-600/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <SlidersHorizontal className="size-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-black">Filtreler</h2>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Sonuçları hızla daraltın
                </p>
              </div>
            </div>
            {getActiveFilterCount(params) > 0 ? (
              <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black">
                {getActiveFilterCount(params)} aktif
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
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
      <div
        className={
          mobile
            ? "space-y-3"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin]"
        }
      >
        <FilterGroup title="Fiyat Aralığı" mobile={mobile}>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="sr-only">En düşük fiyat</span>
              <Input
                name="minFiyat"
                inputMode="numeric"
                placeholder="En az"
                defaultValue={
                  Array.isArray(params.minFiyat)
                    ? params.minFiyat[0]
                    : params.minFiyat
                }
                className="h-10 rounded-xl border-zinc-200 bg-zinc-50 px-3 focus:bg-white"
              />
            </label>
            <label>
              <span className="sr-only">En yüksek fiyat</span>
              <Input
                name="maxFiyat"
                inputMode="numeric"
                placeholder="En çok"
                defaultValue={
                  Array.isArray(params.maxFiyat)
                    ? params.maxFiyat[0]
                    : params.maxFiyat
                }
                className="h-10 rounded-xl border-zinc-200 bg-zinc-50 px-3 focus:bg-white"
              />
            </label>
          </div>
        </FilterGroup>
        <FilterGroup title="Kategori" mobile={mobile}>
          <Options
            name="kategori"
            options={categories}
            selected={selectedCategories}
            mobile={mobile}
          />
        </FilterGroup>
        <FilterGroup title="Marka" mobile={mobile}>
          <Options
            name="brand"
            options={brands}
            selected={selectedBrands}
            mobile={mobile}
          />
        </FilterGroup>
        <FilterGroup title="Durum" mobile={mobile}>
          <FilterCheckbox
            name="stok"
            label="Stokta olanlar"
            checked={params.stok === "var"}
          />
          <FilterCheckbox
            name="indirim"
            label="İndirimli ürünler"
            checked={params.indirim === "var"}
            className="mt-2"
          />
        </FilterGroup>
        <div
          className={
            mobile
              ? "sticky bottom-0 z-raised -mx-1 space-y-1 rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur"
              : "sticky bottom-0 border-t border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur"
          }
        >
          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-sm font-black shadow-lg shadow-red-600/15"
          >
            <Sparkles className="mr-2 size-4" />
            Filtreleri Uygula
          </Button>
          <Link
            href={
              query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath
            }
            className="flex h-9 items-center justify-center rounded-xl text-xs font-bold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            Tüm filtreleri temizle
          </Link>
        </div>
      </div>
    </form>
  );
}

function FilterCheckbox({
  name,
  label,
  checked,
  className = "",
}: {
  name: string;
  label: string;
  checked: boolean;
  className?: string;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-white has-[:checked]:border-red-200 has-[:checked]:bg-red-50 has-[:checked]:text-zinc-950 ${className}`}
    >
      <input
        name={name}
        value="var"
        type="checkbox"
        defaultChecked={checked}
        className="peer sr-only"
      />
      <span className="grid size-5 shrink-0 place-items-center rounded-md border border-zinc-300 bg-white text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
        <Check className="size-3.5" />
      </span>
      {label}
    </label>
  );
}

function Options({
  name,
  options,
  selected,
  mobile = false,
}: {
  name: string;
  options: { id: string; name: string; slug: string }[];
  selected: Set<string>;
  mobile?: boolean;
}) {
  return (
    <div
      className={
        mobile ? "grid grid-cols-1 gap-2 min-[430px]:grid-cols-2" : "space-y-1"
      }
    >
      {options.map((option) => (
        <label
          key={option.id}
          className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2.5 text-sm font-semibold text-zinc-600 transition-all hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950 has-[:checked]:border-red-200 has-[:checked]:bg-red-50 has-[:checked]:text-zinc-950"
        >
          <input
            name={name}
            value={option.slug}
            type="checkbox"
            defaultChecked={selected.has(option.slug)}
            className="peer sr-only"
          />
          <span className="grid size-5 shrink-0 place-items-center rounded-md border border-zinc-300 bg-white text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
            <Check className="size-3.5" />
          </span>
          <span className="truncate">{option.name}</span>
        </label>
      ))}
    </div>
  );
}
function FilterGroup({
  title,
  children,
  mobile = false,
}: {
  title: string;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <section
      className={
        mobile
          ? "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          : "border-b border-zinc-100 px-5 py-5 last:border-0"
      }
    >
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-zinc-950">
        {title}
      </h3>
      {children}
    </section>
  );
}

function getActiveFilterCount(params: CatalogSearchParams) {
  const categories = Array.isArray(params.kategori)
    ? params.kategori.length
    : params.kategori
      ? 1
      : 0;
  const brandParam = params.brand ?? params.marka;
  const brands = Array.isArray(brandParam)
    ? brandParam.length
    : brandParam
      ? 1
      : 0;

  return (
    categories +
    brands +
    (params.minFiyat ? 1 : 0) +
    (params.maxFiyat ? 1 : 0) +
    (params.stok === "var" ? 1 : 0) +
    (params.indirim === "var" ? 1 : 0)
  );
}
