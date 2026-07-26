import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({
  selected,
  className,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-xs font-semibold transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-border bg-surface text-zinc-600 hover:border-border-strong hover:text-zinc-950",
        className,
      )}
      {...props}
    />
  );
}
