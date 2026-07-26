"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Flame,
  FolderSearch2,
  Search,
  Store,
  X,
} from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { supabaseSearchDataSource } from "@/lib/search/supabase-search-data-source";
import { cn } from "@/lib/utils";
import type { SearchSuggestion, SearchSuggestionGroups } from "@/types/search";

const emptyGroups: SearchSuggestionGroups = {
  products: [],
  brands: [],
  categories: [],
  recent: [],
  popular: [],
};

export function GlobalSearch({
  variant = "desktop",
  className,
}: {
  variant?: "desktop" | "mobile";
  className?: string;
}) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState(emptyGroups);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await supabaseSearchDataSource.suggestions(query);
      if (active) {
        setGroups(result);
        setLoading(false);
        setActiveIndex(-1);
      }
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const suggestions = useMemo(
    () =>
      [
        groups.products,
        groups.brands,
        groups.categories,
        groups.recent,
        groups.popular,
      ].flat(),
    [groups],
  );

  function navigate(suggestion?: SearchSuggestion) {
    const href =
      suggestion?.href ?? `/arama?q=${encodeURIComponent(query.trim())}`;
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      navigate(activeIndex >= 0 ? suggestions[activeIndex] : undefined);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 z-raised size-4 -translate-y-1/2 text-zinc-400"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            variant === "mobile"
              ? "Ne aramıştınız?"
              : "Ürün, kategori veya marka ara"
          }
          role="combobox"
          aria-label="Global ürün araması"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          className="h-12 rounded-full bg-surface-subtle pl-11 pr-11"
        />
        {query ? (
          <IconButton
            label="Aramayı temizle"
            size="sm"
            className="absolute right-1.5 top-1/2 z-raised -translate-y-1/2"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
          >
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Arama önerileri"
          className={cn(
            "z-dropdown overflow-y-auto border border-border bg-white shadow-lg transition-all duration-200 ease-premium",
            variant === "desktop"
              ? "absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-[70vh] rounded-xl"
              : "fixed inset-x-0 bottom-0 top-[147px] rounded-t-xl border-x-0 px-4 pb-8 pt-2",
          )}
        >
          {loading ? (
            <div
              role="status"
              className="px-5 py-4 text-xs font-semibold text-muted"
            >
              Öneriler hazırlanıyor…
            </div>
          ) : (
            <div
              className={cn(
                "grid",
                variant === "desktop" && "lg:grid-cols-[1.35fr_0.65fr]",
              )}
            >
              <div className="p-3 sm:p-4">
                <SuggestionSection
                  title="Ürünler"
                  icon={Search}
                  suggestions={groups.products}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                />
                {groups.products.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted">
                    Eşleşen ürün önerisi bulunamadı.
                  </p>
                ) : null}
              </div>
              <div className="border-t border-border bg-surface-subtle/70 p-3 sm:p-4 lg:border-l lg:border-t-0">
                <SuggestionSection
                  title="Markalar"
                  icon={Store}
                  suggestions={groups.brands}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  compact
                />
                <SuggestionSection
                  title="Kategoriler"
                  icon={FolderSearch2}
                  suggestions={groups.categories}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  compact
                />
                <SuggestionSection
                  title="Son aramalar"
                  icon={Clock3}
                  suggestions={groups.recent}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  compact
                />
                <SuggestionSection
                  title="Popüler aramalar"
                  icon={Flame}
                  suggestions={groups.popular}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  compact
                />
              </div>
            </div>
          )}
          <div className="sticky bottom-0 border-t border-border bg-white/95 p-3 backdrop-blur">
            <button
              type="button"
              onClick={() => navigate()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-3 text-xs font-bold text-white transition-colors duration-200 hover:bg-zinc-800"
            >
              “{query || "Tüm ürünler"}” için tüm sonuçları gör
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SuggestionSection({
  title,
  icon: Icon,
  suggestions,
  allSuggestions,
  activeIndex,
  listboxId,
  compact,
}: {
  title: string;
  icon: typeof Search;
  suggestions: SearchSuggestion[];
  allSuggestions: SearchSuggestion[];
  activeIndex: number;
  listboxId: string;
  compact?: boolean;
}) {
  if (suggestions.length === 0) return null;
  return (
    <section className="mb-4 last:mb-0">
      <h2 className="mb-2 flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        <Icon className="size-3.5" aria-hidden="true" />
        {title}
      </h2>
      <div className={cn(compact && "flex flex-wrap gap-1.5")}>
        {suggestions.map((suggestion) => {
          const index = allSuggestions.findIndex(
            (item) => item.id === suggestion.id,
          );
          if (compact)
            return (
              <Link
                key={suggestion.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                href={suggestion.href}
                className={cn(
                  "rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors duration-150 hover:border-border-strong hover:text-foreground",
                  activeIndex === index &&
                    "border-zinc-950 bg-zinc-950 text-white",
                )}
              >
                {suggestion.label}
              </Link>
            );
          return (
            <Link
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              href={suggestion.href}
              className={cn(
                "flex items-center gap-3 rounded-md p-2 transition-colors duration-150 hover:bg-surface-subtle",
                activeIndex === index && "bg-surface-muted",
              )}
            >
              {suggestion.product ? (
                <div className="size-14 shrink-0 overflow-hidden rounded-sm">
                  <ProductVisual product={suggestion.product} />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {suggestion.label}
                </p>
                {suggestion.description ? (
                  <p className="mt-1 truncate text-xs text-muted">
                    {suggestion.description}
                  </p>
                ) : null}
              </div>
              <ArrowRight
                className="ml-auto size-4 shrink-0 text-zinc-400"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
