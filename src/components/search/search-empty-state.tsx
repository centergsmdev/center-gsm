import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback-state";

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <div>
      <EmptyState
        title={`“${query}” için sonuç bulunamadı`}
        description="Yazımı kontrol edin, daha genel bir ifade deneyin veya kategori sayfasına göz atın."
      />
      <div className="mt-5 flex justify-center">
        <Link
          href="/urunler"
          className={buttonVariants({ variant: "secondary", size: "md" })}
        >
          Tüm Ürünleri Gör
        </Link>
      </div>
    </div>
  );
}
