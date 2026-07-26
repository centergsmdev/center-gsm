import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-zinc-700",
        brand: "bg-red-50 text-primary",
        dark: "bg-zinc-950 text-white",
        success: "bg-emerald-50 text-success",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-danger",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ variant, className, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
