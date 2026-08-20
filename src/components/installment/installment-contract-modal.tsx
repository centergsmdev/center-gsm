"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function InstallmentContractModal({
  open,
  title,
  renderedContent,
  onClose,
}: {
  open: boolean;
  title: string;
  renderedContent: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-modal grid items-end bg-zinc-950/55 backdrop-blur-sm sm:place-items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="installment-contract-dialog-title"
        className="max-h-[92dvh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 sm:px-7">
          <h2
            id="installment-contract-dialog-title"
            className="text-lg font-black tracking-tight text-zinc-950"
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Sözleşmeyi kapat"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-zinc-200 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
        <div className="max-h-[calc(92dvh-82px)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-7">
          <div
            className="rich-product-content break-words text-sm leading-7 text-zinc-700 sm:text-base sm:leading-8"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>
      </section>
    </div>
  );
}
