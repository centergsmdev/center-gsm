import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const styles = {
  neutral: "bg-zinc-100 text-zinc-700",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
  info: "bg-blue-50 text-blue-700 ring-blue-600/15",
};

export function AdminBadge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: keyof typeof styles;
}) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset", styles[variant])}>
      {children}
    </span>
  );
}
