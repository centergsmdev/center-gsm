import Link from "next/link";

import { ProductDetailEmptyState } from "@/components/product-detail/product-detail-states";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function ProductNotFound() {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <ProductDetailEmptyState />
        <div className="mt-5 flex justify-center">
          <Link
            href="/urunler"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            Ürünlere Dön
          </Link>
        </div>
      </Container>
    </main>
  );
}
