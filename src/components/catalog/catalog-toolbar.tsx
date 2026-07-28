"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CatalogToolbar({
  count,
  compactMobile = false,
}: {
  count: number;
  compactMobile?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sirala") ?? "popular";
  return (
    <div
      className={`flex border-y border-border sm:flex-row sm:items-center sm:justify-between sm:py-4 ${
        compactMobile
          ? "flex-row items-center gap-2 py-2.5"
          : "flex-col gap-3 py-4"
      }`}
    >
      <p
        className={`text-sm text-muted ${
          compactMobile
            ? "order-2 shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] shadow-xs sm:order-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:shadow-none"
            : ""
        }`}
      >
        <strong className="text-foreground">{count} ürün</strong> listeleniyor
      </p>
      <div className="flex min-w-0 flex-1 items-center sm:flex-none">
        <label className="flex flex-1 items-center gap-2 sm:flex-none">
          <span className="sr-only sm:not-sr-only sm:text-xs sm:font-semibold sm:text-muted">
            Sırala
          </span>
          <select
            aria-label="Ürünleri sırala"
            value={currentSort}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams.toString());
              next.set("sirala", event.target.value);
              next.delete("sayfa");
              router.push(`${pathname}?${next.toString()}`);
            }}
            className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface pl-3 pr-8 text-xs font-semibold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-red-100 sm:w-48"
          >
            <option value="popular">En Popüler</option>
            <option value="newest">En Yeni</option>
            <option value="price-asc">Fiyat Artan</option>
            <option value="price-desc">Fiyat Azalan</option>
          </select>
        </label>
      </div>
    </div>
  );
}
