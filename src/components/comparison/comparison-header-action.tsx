"use client";

import Link from "next/link";
import { GitCompareArrows } from "lucide-react";

import { useComparison } from "@/providers/comparison-provider";

export function ComparisonHeaderAction() {
  const { count } = useComparison();
  return (
    <Link
      href="/karsilastir"
      aria-label={`Karşılaştırma listesi, ${count} ürün`}
      className="group relative hidden min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-zinc-600 transition-colors duration-200 hover:bg-surface-subtle hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:flex"
    >
      <span className="relative">
        <GitCompareArrows
          className="size-5"
          strokeWidth={1.7}
          aria-hidden="true"
        />
        {count > 0 ? (
          <span
            className="absolute -right-2.5 -top-2.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-black leading-none text-white"
            aria-hidden="true"
          >
            {count}
          </span>
        ) : null}
      </span>
      <span className="hidden text-[10px] font-semibold xl:block">
        Karşılaştır
      </span>
    </Link>
  );
}
