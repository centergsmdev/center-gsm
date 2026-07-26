import { SearchX } from "lucide-react";

export function OrderNotFound() {
  return (
    <div
      role="alert"
      className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-left"
    >
      <div className="flex gap-3">
        <SearchX
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-black text-red-950">Sipariş bulunamadı</p>
          <p className="mt-1 text-xs leading-5 text-red-800">
            Sipariş numarası ile e-posta veya telefon bilginizi kontrol edip
            yeniden deneyin.
          </p>
        </div>
      </div>
    </div>
  );
}
