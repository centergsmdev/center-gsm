import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminTable({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function AdminTh({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("bg-zinc-50/80 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500", className)}>{children}</th>;
}

export function AdminTd({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-t border-zinc-100 px-5 py-4 text-zinc-700", className)}>{children}</td>;
}
