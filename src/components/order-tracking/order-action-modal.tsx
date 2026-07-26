"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OrderActionModal({
  type,
  onClose,
}: {
  type: "cancel" | "return";
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [onClose]);
  const cancel = type === "cancel";
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-action-title"
        aria-describedby="order-action-description"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-800">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Pencereyi kapat"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h2 id="order-action-title" className="mt-5 text-xl font-black">
          {cancel ? "Sipariş iptal talebi" : "İade talebi"}
        </h2>
        <p
          id="order-action-description"
          className="mt-3 text-sm leading-6 text-muted"
        >
          {cancel
            ? "Bu demo ekranda gerçek bir iptal talebi oluşturulmaz. Canlı sistemde uygun siparişler için talebiniz destek ekibine iletilir."
            : "Bu demo ekranda gerçek bir iade kaydı açılmaz. Canlı sistemde ürün ve iade nedenini seçebileceksiniz."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Demo Talebi Onayla
          </Button>
        </div>
      </div>
    </div>
  );
}
