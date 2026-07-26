"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { useFavorites } from "@/providers/favorites-provider";

export function FavoritesHeaderAction() {
  const { count } = useFavorites();
  return (
    <Link
      href="/favoriler"
      aria-label={`Favoriler, ${count} ürün`}
      className="group relative hidden min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-zinc-600 transition-colors duration-200 hover:bg-surface-subtle hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-[360px]:flex"
    >
      <span className="relative">
        <Heart className="size-5" strokeWidth={1.7} aria-hidden="true" />
        <span className="absolute -right-2.5 -top-2.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-white">
          {count}
        </span>
      </span>
      <span className="hidden text-[10px] font-semibold xl:block">
        Favoriler
      </span>
    </Link>
  );
}
