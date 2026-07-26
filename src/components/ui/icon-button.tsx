import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md";
  variant?: "ghost" | "outline" | "dark";
};

export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-45",
        size === "sm" ? "size-9" : "size-11",
        variant === "ghost" &&
          "text-zinc-600 hover:bg-surface-muted hover:text-zinc-950",
        variant === "outline" &&
          "border border-border bg-surface text-zinc-700 shadow-xs hover:border-border-strong hover:shadow-sm",
        variant === "dark" &&
          "bg-zinc-950 text-white shadow-sm hover:bg-zinc-800 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}
