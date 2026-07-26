"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";

export function CatalogToolbar({ count }: { count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sirala") ?? "popular";
  return (
    <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        <strong className="text-foreground">{count} ürün</strong> listeleniyor
      </p>
      <div className="flex items-center gap-2">
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
        <div
          className="hidden items-center gap-1 sm:flex"
          aria-label="Görünüm seçimi"
        >
          <IconButton
            label="Izgara görünümü"
            size="sm"
            variant="dark"
            aria-pressed="true"
          >
            <LayoutGrid className="size-4" />
          </IconButton>
          <IconButton
            label="Liste görünümü"
            size="sm"
            variant="ghost"
            aria-pressed="false"
          >
            <List className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
