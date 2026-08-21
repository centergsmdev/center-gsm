"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, SearchX } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FaqItem } from "@/types/database";

const allCategories = "Tümü";

export function FaqExplorer({ items }: { items: FaqItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allCategories);
  const categories = useMemo(
    () => [
      allCategories,
      ...Array.from(new Set(items.map((item) => item.category))),
    ],
    [items],
  );
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return items.filter((item) => {
      if (category !== allCategories && item.category !== category)
        return false;
      if (!normalized) return true;
      return `${item.question} ${item.answer} ${item.category}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalized);
    });
  }, [category, items, query]);

  return (
    <section aria-labelledby="faq-list-title" className="mt-8 sm:mt-10">
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Hızlı yanıtlar
            </p>
            <h2
              id="faq-list-title"
              className="mt-1 text-xl font-black sm:text-2xl"
            >
              Merak ettiğiniz konuyu bulun
            </h2>
          </div>
          <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 lg:max-w-md">
            <Search
              className="size-5 shrink-0 text-zinc-400"
              aria-hidden="true"
            />
            <span className="sr-only">Sorularda ara</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ödeme, evrak, peşinat…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>
        <div
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
          aria-label="SSS kategorileri"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition",
                category === item
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="mt-5 space-y-3">
          {visible.map((item) => (
            <details
              key={item.id}
              className="group rounded-2xl border border-zinc-200 bg-white shadow-sm open:border-zinc-300 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
                    {item.category}
                  </span>
                  <span className="mt-1 block text-sm font-black leading-6 text-zinc-950 sm:text-base">
                    {item.question}
                  </span>
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-700 transition group-open:rotate-180 group-open:bg-zinc-950 group-open:text-white">
                  <ChevronDown className="size-4" aria-hidden="true" />
                </span>
              </summary>
              <div className="border-t border-zinc-100 px-5 py-5 text-sm leading-7 text-zinc-600 sm:px-6">
                <p className="whitespace-pre-line">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <SearchX className="size-8 text-zinc-300" aria-hidden="true" />
          <h3 className="mt-3 font-black">
            Aramanızla eşleşen soru bulunamadı
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Farklı bir kelime deneyebilir veya canlı destekten bize
            ulaşabilirsiniz.
          </p>
        </div>
      )}
    </section>
  );
}
