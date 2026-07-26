import { ErrorState } from "@/components/ui/feedback-state";

export function CartErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Sepet yüklenemedi"
      description="Sepet bilgileriniz hazırlanırken bir sorun oluştu. Lütfen yeniden deneyin."
      actionLabel={onRetry ? "Yeniden Dene" : undefined}
      onAction={onRetry}
    />
  );
}
