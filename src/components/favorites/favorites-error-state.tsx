import { ErrorState } from "@/components/ui/feedback-state";

export function FavoritesErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Favoriler yüklenemedi"
      description="Favori ürünleriniz hazırlanırken bir sorun oluştu. Lütfen yeniden deneyin."
      actionLabel={onRetry ? "Yeniden Dene" : undefined}
      onAction={onRetry}
    />
  );
}
