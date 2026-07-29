"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

type NavigationCategory = { name: string; slug: string };

export function MobileNavigation({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        aria-label={open ? "Ana menüyü kapat" : "Ana menüyü aç"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((current) => !current)}
        className="flex size-10 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Mobil menüyü kapat"
            className="z-overlay fixed inset-0 cursor-default bg-zinc-950/10 backdrop-blur-[1px] lg:hidden"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-navigation"
            aria-label="Mobil ürün kategorileri"
            className="absolute left-0 top-12 z-modal w-64 rounded-lg border border-border bg-white p-2 shadow-xl"
          >
            <Link
              href="/urunler"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Tüm Kategoriler
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/kategori/${category.slug}`}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {category.name}
              </Link>
            ))}
            <Link
              href="/#deals"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Kampanyalar
            </Link>
          </nav>
        </>
      ) : null}
    </div>
  );
}
