"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { useCart } from "@/providers/cart-provider";

export function CartHeaderAction() {
  const { itemCount } = useCart();
  return (
    <Link
      href="/sepet"
      aria-label={`Sepet, ${itemCount} ürün`}
      className="group relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-zinc-600 transition-colors duration-200 hover:bg-surface-subtle hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="relative">
        <ShoppingBag className="size-5" strokeWidth={1.7} aria-hidden="true" />
        <span className="absolute -right-2.5 -top-2.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-white">
          {itemCount}
        </span>
      </span>
      <span className="hidden text-[10px] font-semibold xl:block">Sepet</span>
    </Link>
  );
}
