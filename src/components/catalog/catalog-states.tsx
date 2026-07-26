import { ErrorState, EmptyState } from "@/components/ui/feedback-state";

export function CatalogEmptyState() {
  return (
    <EmptyState
      title="Aramanızla eşleşen ürün bulunamadı"
      description="Filtreleri temizleyerek veya farklı bir arama yaparak yeniden deneyebilirsiniz."
    />
  );
}

export function CatalogErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Ürünler yüklenemedi"
      description="Katalog bilgileri alınırken bir sorun oluştu. Lütfen yeniden deneyin."
      actionLabel={onRetry ? "Yeniden Dene" : undefined}
      onAction={onRetry}
    />
  );
}
