"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { Check, SlidersHorizontal, Sparkles, X } from "lucide-react";

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
      className={mobile ? "space-y-3" : undefined}
    >
      <div
        className={`items-center justify-between ${mobile ? "hidden" : "flex"}`}
      >
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
      <Divider className={mobile ? "hidden" : "my-5"} />
      <FilterGroup title="Fiyat Aralığı" mobile={mobile}>
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
        <label
          className={
            mobile
              ? "group flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-700"
              : "flex cursor-pointer items-center gap-3 text-sm text-zinc-600"
          }
        >
          <input
            name="stok"
            value="var"
            type="checkbox"
            defaultChecked={params.stok === "var"}
            className={mobile ? "peer sr-only" : "size-4 accent-red-600"}
          />
          {mobile ? (
            <span className="grid size-5 place-items-center rounded-md border border-zinc-300 bg-white text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
              <Check className="size-3.5" />
            </span>
          ) : null}
          Stokta olanlar
        </label>
        <label
          className={
            mobile
              ? "group mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-700"
              : "mt-3 flex cursor-pointer items-center gap-3 text-sm text-zinc-600"
          }
        >
          <input
            name="indirim"
            value="var"
            type="checkbox"
            defaultChecked={params.indirim === "var"}
            className={mobile ? "peer sr-only" : "size-4 accent-red-600"}
          />
          {mobile ? (
            <span className="grid size-5 place-items-center rounded-md border border-zinc-300 bg-white text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
              <Check className="size-3.5" />
            </span>
          ) : null}
          İndirimli ürünler
        </label>
      </FilterGroup>
      <Button
        type="submit"
        className={
          mobile
            ? "h-12 w-full rounded-2xl text-sm font-black shadow-lg shadow-red-600/15"
            : "mt-5 w-full"
        }
      >
        {mobile ? <Sparkles className="mr-2 size-4" /> : null}
        Filtreleri Uygula
      </Button>
      {mobile ? (
        <Link
          href={query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath}
          className="flex h-11 items-center justify-center rounded-2xl text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
          Tüm filtreleri temizle
        </Link>
      ) : null}
    </form>
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
    <div className={mobile ? "grid grid-cols-2 gap-2" : "space-y-3"}>
      {options.map((option) => (
        <label
          key={option.id}
          className={
            mobile
              ? "flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-300"
              : "flex cursor-pointer items-center gap-3 text-sm text-zinc-600 hover:text-foreground"
          }
        >
          <input
            name={name}
            value={option.slug}
            type="checkbox"
            defaultChecked={selected.has(option.slug)}
            className={mobile ? "peer sr-only" : "size-4 accent-red-600"}
          />
          {mobile ? (
            <span className="grid size-5 shrink-0 place-items-center rounded-md border border-zinc-300 bg-white text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
              <Check className="size-3.5" />
            </span>
          ) : null}
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
          : "border-b border-border py-5 first:pt-0 last:border-0 last:pb-0"
      }
    >
      <h3 className="mb-4 text-sm font-bold">{title}</h3>
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
