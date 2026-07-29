"use client";

import { FavoritesBreadcrumb } from "@/components/favorites/favorites-breadcrumb";
import { FavoritesGrid } from "@/components/favorites/favorites-grid";
import { Container } from "@/components/ui/container";
import { useFavorites } from "@/providers/favorites-provider";

export default function FavoritesPage() {
  const { count, isLoading } = useFavorites();
  return (
    <main className="min-h-screen bg-surface-subtle/50 pb-16 pt-3 sm:pb-20 sm:pt-8">
      <Container>
        <FavoritesBreadcrumb />
        <div className="mt-6 max-sm:hidden">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Kaydettikleriniz
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            Favorilerim
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {isLoading
              ? "Favori ürünleriniz güvenli şekilde yükleniyor."
              : count > 0
                ? `${count} favori ürününüzü karşılaştırabilir veya doğrudan sepetinize ekleyebilirsiniz.`
                : "Beğendiğiniz ürünler burada görüntülenecek."}
          </p>
        </div>
        <div className="mt-3 sm:mt-8">
          <FavoritesGrid />
        </div>
      </Container>
    </main>
  );
}
