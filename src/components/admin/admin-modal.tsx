"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-modal grid place-items-end bg-zinc-950/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={cn(
          "max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-4xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between border-b border-zinc-100 p-5">
          <div>
            <h2 id="admin-modal-title" className="font-bold text-zinc-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon"
            aria-label="Pencereyi kapat"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>
        {children ? <div className="p-5">{children}</div> : null}
        {footer ? (
          <div className="flex justify-end gap-3 border-t border-zinc-100 p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
