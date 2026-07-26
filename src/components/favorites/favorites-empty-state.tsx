import Link from "next/link";
import { Heart } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function FavoritesEmptyState() {
  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-white text-primary shadow-sm">
        <Heart className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-6 text-2xl font-black tracking-tight">
        Favori listeniz boş
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        Beğendiğiniz ürünleri kalp simgesine dokunarak burada saklayabilir, daha
        sonra karşılaştırabilir veya sepete ekleyebilirsiniz.
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
