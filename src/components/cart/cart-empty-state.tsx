import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function CartEmptyState() {
  return (
    <div className="home-premium-surface flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-white/80 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
      <span className="grid size-20 place-items-center rounded-full bg-zinc-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)]">
        <ShoppingBag className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-black tracking-tight">
        Sepetiniz şu anda boş
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        Size uygun teknoloji ürünlerini keşfedin ve beğendiklerinizi sepetinize
        ekleyin.
      </p>
      <Link
        href="/urunler"
        className={`${buttonVariants({ variant: "primary", size: "lg" })} mt-6`}
      >
        Alışverişe Devam Et
      </Link>
    </div>
  );
}
