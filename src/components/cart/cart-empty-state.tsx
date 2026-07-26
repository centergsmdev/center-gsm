import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function CartEmptyState() {
  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-white text-zinc-700 shadow-sm">
        <ShoppingBag className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-black tracking-tight">
        Sepetiniz henüz boş
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        Size uygun teknoloji ürünlerini keşfedin ve beğendiklerinizi sepetinize
        ekleyin.
      </p>
      <Link
        href="/urunler"
        className={`${buttonVariants({ variant: "primary", size: "lg" })} mt-6`}
      >
        Ürünleri Keşfet
      </Link>
    </div>
  );
}
