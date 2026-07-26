import { ErrorState } from "@/components/ui/feedback-state";

export function ComparisonErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Karşılaştırma listesi yüklenemedi"
      description="Ürün bilgileri hazırlanırken bir sorun oluştu. Lütfen yeniden deneyin."
      actionLabel={onRetry ? "Yeniden Dene" : undefined}
      onAction={onRetry}
    />
  );
}
