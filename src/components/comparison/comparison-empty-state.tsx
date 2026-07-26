import Link from "next/link";
import { GitCompareArrows } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function ComparisonEmptyState() {
  return (
    <section
      className="rounded-xl border border-border bg-white px-6 py-14 text-center shadow-xs sm:py-20"
      aria-labelledby="empty-comparison-title"
    >
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-primary">
        <GitCompareArrows className="size-7" aria-hidden="true" />
      </span>
      <h2
        id="empty-comparison-title"
        className="mt-5 text-2xl font-black tracking-tight"
      >
        Karşılaştırma listeniz boş
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
        Ürünlerin fiyat, teslimat ve teknik özelliklerini yan yana görmek için
        katalogdaki karşılaştırma simgesini kullanın.
      </p>
      <Link href="/urunler" className={buttonVariants({ className: "mt-7" })}>
        Ürünleri İncele
      </Link>
    </section>
  );
}
