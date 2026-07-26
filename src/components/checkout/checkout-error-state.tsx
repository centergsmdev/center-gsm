import { ErrorState } from "@/components/ui/feedback-state";

export function CheckoutErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Ödeme adımı yüklenemedi"
      description="Sipariş bilgileri hazırlanırken bir sorun oluştu. Sepetiniz korunuyor; yeniden deneyebilirsiniz."
      actionLabel={onRetry ? "Yeniden Dene" : undefined}
      onAction={onRetry}
    />
  );
}
