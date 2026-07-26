import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({
  className,
  invalid,
  type = "text",
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-foreground shadow-xs outline-none transition-all duration-200 ease-premium placeholder:text-zinc-400 hover:border-border-strong focus:border-primary focus:shadow-focus disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60",
        invalid && "border-danger focus:border-danger",
        className,
      )}
      {...props}
    />
  );
}
