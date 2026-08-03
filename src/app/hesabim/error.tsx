"use client";
import { ErrorState } from "@/components/ui/feedback-state";
export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Hesap bilgileri yüklenemedi"
      description="Hesap alanı hazırlanırken bir sorun oluştu."
      actionLabel="Yeniden Dene"
      onAction={reset}
      className="min-h-[50vh]"
    />
  );
}
