import { EmptyState, ErrorState } from "@/components/ui/feedback-state";

export function ProductDetailEmptyState() {
  return (
    <EmptyState
      title="Ürün bulunamadı"
      description="Aradığınız ürün kaldırılmış veya bağlantısı değişmiş olabilir."
    />
  );
}

export function ProductDetailErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Ürün bilgileri yüklenemedi"
      description="Ürün detayları hazırlanırken bir sorun oluştu. Lütfen yeniden deneyin."
      actionLabel={onRetry ? "Yeniden Dene" : undefined}
      onAction={onRetry}
    />
  );
}
