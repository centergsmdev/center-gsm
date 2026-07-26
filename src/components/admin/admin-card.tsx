import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,.03),0_12px_32px_rgba(0,0,0,.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function AdminCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h2 className="text-base font-bold tracking-tight text-zinc-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
