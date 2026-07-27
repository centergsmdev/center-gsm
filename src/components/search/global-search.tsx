"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Flame,
  FolderSearch2,
  Search,
  SearchX,
  Store,
  X,
} from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { supabaseSearchDataSource } from "@/lib/search/supabase-search-data-source";
import { cn } from "@/lib/utils";
import type { SearchSuggestion, SearchSuggestionGroups } from "@/types/search";

const RECENT_SEARCHES_KEY = "center-gsm-recent-searches";
const MAX_RECENT_SEARCHES = 6;
const popularTerms = [
  "iPhone",
  "PlayStation",
  "Samsung",
  "AirPods",
  "Apple Watch",
  "Tablet",
  "Kulaklık",
];

const emptyGroups: SearchSuggestionGroups = {
  products: [],
  brands: [],
  categories: [],
  recent: [],
  popular: [],
};

function termSuggestion(
  term: string,
  kind: "recent" | "popular",
  index: number,
): SearchSuggestion {
  return {
    id: `${kind}-${index}-${term}`,
    kind,
    label: term,
    href: `/urunler?search=${encodeURIComponent(term)}`,
  };
}

export function GlobalSearch({
  variant = "desktop",
  className,
}: {
  variant?: "desktop" | "mobile";
  className?: string;
}) {
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState(emptyGroups);
  const [recentTerms, setRecentTerms] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setRecentTerms(
          parsed.filter((item): item is string => typeof item === "string"),
        );
      }
    } catch {
      setRecentTerms([]);
    }
  }, []);

  useEffect(() => {
    if (!open || variant !== "mobile") return;
    const frame = window.requestAnimationFrame(() =>
      document.getElementById(inputId)?.focus(),
    );
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [inputId, open, variant]);

  useEffect(() => {
    if (!trimmedQuery) {
      setLoading(false);
      setGroups({
        ...emptyGroups,
        recent: recentTerms.map((term, index) =>
          termSuggestion(term, "recent", index),
        ),
        popular: popularTerms.map((term, index) =>
          termSuggestion(term, "popular", index),
        ),
      });
      setActiveIndex(-1);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await supabaseSearchDataSource.suggestions(trimmedQuery);
      if (active) {
        setGroups({ ...result, recent: [], popular: [] });
        setLoading(false);
        setActiveIndex(-1);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recentTerms, trimmedQuery]);

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

  function rememberSearch(term: string) {
    const normalized = term.trim();
    if (!normalized) return;
    const next = [
      normalized,
      ...recentTerms.filter(
        (item) =>
          item.toLocaleLowerCase("tr-TR") !==
          normalized.toLocaleLowerCase("tr-TR"),
      ),
    ].slice(0, MAX_RECENT_SEARCHES);
    setRecentTerms(next);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // Arama, tarayıcı depolaması kullanılamadığında da çalışmaya devam eder.
    }
  }

  function closeSearch() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function navigate(suggestion?: SearchSuggestion) {
    const term = trimmedQuery || suggestion?.label || "";
    rememberSearch(term);
    closeSearch();
    router.push(
      suggestion?.href ?? `/urunler?search=${encodeURIComponent(term)}`,
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        suggestions.length ? (index + 1) % suggestions.length : -1,
      );
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        suggestions.length
          ? index <= 0
            ? suggestions.length - 1
            : index - 1
          : -1,
      );
    }
    if (event.key === "Enter") {
      event.preventDefault();
      navigate(activeIndex >= 0 ? suggestions[activeIndex] : undefined);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  }

  const hasMatches =
    groups.products.length > 0 ||
    groups.brands.length > 0 ||
    groups.categories.length > 0;

  const searchInput = (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 z-raised size-4 -translate-y-1/2 text-zinc-400"
      />
      <Input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Ürün, kategori veya marka ara"
        role="combobox"
        aria-label="Global ürün araması"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        className={cn(
          "h-12 rounded-full border-zinc-200 bg-surface-subtle pl-11 pr-11 shadow-inner focus:bg-white",
          variant === "mobile" && "text-base",
        )}
      />
      {query ? (
        <IconButton
          label="Aramayı temizle"
          size="sm"
          className="absolute right-1.5 top-1/2 z-raised -translate-y-1/2"
          onClick={() => {
            setQuery("");
            setOpen(true);
            document.getElementById(inputId)?.focus();
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      ) : null}
    </div>
  );

  const resultsPanel = (
    <div
      id={listboxId}
      role="listbox"
      aria-label="Arama önerileri"
      className={cn(
        "overflow-y-auto bg-white",
        variant === "desktop" &&
          "absolute inset-x-0 top-[calc(100%+0.5rem)] z-dropdown max-h-[72vh] rounded-2xl border border-zinc-200 shadow-[0_24px_70px_rgba(15,23,42,0.18)]",
        variant === "mobile" && "min-h-0 flex-1",
      )}
    >
      {loading ? (
        <div role="status" className="space-y-3 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Sonuçlar aranıyor
          </p>
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="block h-16 animate-pulse rounded-xl bg-zinc-100"
            />
          ))}
        </div>
      ) : trimmedQuery && !hasMatches ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-zinc-100 text-zinc-500 shadow-inner">
            <SearchX className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-black tracking-[-0.03em] text-zinc-950">
            Sonuç bulunamadı
          </h2>
          <p className="mt-2 text-sm text-muted">
            Farklı anahtar kelime deneyin.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid",
            variant === "desktop" && "lg:grid-cols-[1.4fr_0.6fr]",
          )}
        >
          {trimmedQuery ? (
            <div className="p-3 sm:p-4">
              <SuggestionSection
                title="Ürünler"
                icon={Search}
                suggestions={groups.products}
                allSuggestions={suggestions}
                activeIndex={activeIndex}
                listboxId={listboxId}
                onSelect={navigate}
              />
            </div>
          ) : null}
          <div
            className={cn(
              "p-4",
              trimmedQuery &&
                "border-t border-border bg-surface-subtle/70 lg:border-l lg:border-t-0",
            )}
          >
            {trimmedQuery ? (
              <>
                <SuggestionSection
                  title="Markalar"
                  icon={Store}
                  suggestions={groups.brands}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  onSelect={navigate}
                  compact
                />
                <SuggestionSection
                  title="Kategoriler"
                  icon={FolderSearch2}
                  suggestions={groups.categories}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  onSelect={navigate}
                  compact
                />
              </>
            ) : (
              <>
                <SuggestionSection
                  title="Son Aramalar"
                  icon={Clock3}
                  suggestions={groups.recent}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  onSelect={navigate}
                  compact
                />
                <SuggestionSection
                  title="Popüler Aramalar"
                  icon={Flame}
                  suggestions={groups.popular}
                  allSuggestions={suggestions}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  onSelect={navigate}
                  compact
                />
              </>
            )}
          </div>
        </div>
      )}
      <div className="sticky bottom-0 border-t border-border bg-white/95 p-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-3 text-xs font-bold text-white shadow-lg transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary hover:shadow-xl active:scale-[0.99]"
        >
          Tüm sonuçları görüntüle
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  if (variant === "mobile") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center gap-3 rounded-full border border-zinc-200 bg-surface-subtle px-4 text-left text-sm text-zinc-400 shadow-inner transition-colors hover:border-zinc-300 hover:bg-white"
        >
          <Search className="size-4" aria-hidden="true" />
          Ürün, kategori veya marka ara
        </button>
        {open
          ? createPortal(
              <div className="animate-in fade-in fixed inset-0 z-modal flex h-dvh flex-col overflow-hidden bg-white duration-200">
                <div className="flex shrink-0 items-center gap-2 border-b border-border p-3 shadow-sm">
                  <div className="min-w-0 flex-1">{searchInput}</div>
                  <IconButton label="Aramayı kapat" onClick={closeSearch}>
                    <X className="size-5" aria-hidden="true" />
                  </IconButton>
                </div>
                {resultsPanel}
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) closeSearch();
      }}
    >
      {searchInput}
      {open ? resultsPanel : null}
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
  onSelect,
  compact,
}: {
  title: string;
  icon: typeof Search;
  suggestions: SearchSuggestion[];
  allSuggestions: SearchSuggestion[];
  activeIndex: number;
  listboxId: string;
  onSelect: (suggestion: SearchSuggestion) => void;
  compact?: boolean;
}) {
  if (suggestions.length === 0) return null;
  return (
    <section className="mb-5 last:mb-0">
      <h2 className="mb-2 flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        <Icon className="size-3.5" aria-hidden="true" />
        {title}
      </h2>
      <div className={cn(compact && "flex flex-wrap gap-2")}>
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
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(suggestion);
                }}
                className={cn(
                  "rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:text-foreground hover:shadow-sm",
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
              onClick={(event) => {
                event.preventDefault();
                onSelect(suggestion);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-surface-subtle",
                activeIndex === index && "bg-surface-muted shadow-inner",
              )}
            >
              {suggestion.product ? (
                <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                  <ProductVisual product={suggestion.product} />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-foreground">
                  {suggestion.product?.model ?? suggestion.label}
                </p>
                {suggestion.product ? (
                  <p className="mt-1 truncate text-[11px] font-medium text-muted">
                    {suggestion.product.brand} • {suggestion.product.category}
                  </p>
                ) : null}
                {suggestion.product ? (
                  <p className="mt-1 text-sm font-black text-zinc-950">
                    {formatCurrency(suggestion.product.price)}
                  </p>
                ) : null}
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-zinc-400"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
