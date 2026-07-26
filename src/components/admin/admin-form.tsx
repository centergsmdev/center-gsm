import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminFormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 border-b border-zinc-100 pb-4">
        <h2 className="font-bold tracking-tight text-zinc-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminField({ label, htmlFor, hint, required, children, className }: { label: string; htmlFor: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-zinc-800">
        {label}{required ? <span className="ml-1 text-red-600" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs leading-5 text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export const adminControlClass = "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10";
