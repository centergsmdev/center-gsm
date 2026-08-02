import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { productDisplayName } from "@/lib/catalog/variants";
import type { CatalogProduct } from "@/types/product";

export function ProductDetailBreadcrumb({
  product,
}: {
  product: CatalogProduct;
}) {
  return (
    <nav aria-label="Sayfa yolu" className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-2 text-xs text-muted">
        <li>
          <Link
            href="/"
            aria-label="Ana sayfa"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Home className="size-3.5" aria-hidden="true" />
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </li>
        <li>
          <Link
            href="/urunler"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ürünler
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </li>
        <li>
          <Link
            href="/urunler"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {product.category}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </li>
        <li
          className="max-w-52 truncate font-semibold text-foreground"
          aria-current="page"
        >
          {productDisplayName(product)}
        </li>
      </ol>
    </nav>
  );
}
