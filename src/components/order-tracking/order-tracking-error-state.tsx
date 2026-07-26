import { ErrorState } from "@/components/ui/feedback-state";

export function OrderTrackingErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Sipariş bilgileri yüklenemedi"
      description="Demo sipariş bilgileri hazırlanırken bir sorun oluştu. Lütfen yeniden deneyin."
      actionLabel={onRetry ? "Yeniden Dene" : undefined}
      onAction={onRetry}
    />
  );
}
