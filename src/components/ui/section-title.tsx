import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionTitleProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  inverted?: boolean;
  className?: string;
};

export function SectionTitle({
  id,
  eyebrow,
  title,
  description,
  action,
  inverted,
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "mb-5 flex items-end justify-between gap-5 sm:mb-7",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p
            className={cn(
              "mb-2 text-xs font-bold uppercase tracking-[0.2em]",
              inverted ? "text-red-400" : "text-primary",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          id={id}
          className={cn(
            "text-balance text-xl font-bold tracking-[-0.03em] sm:text-3xl",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-3 max-w-xl text-sm leading-6",
              inverted ? "text-zinc-400" : "text-muted",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className={cn(
            "hidden shrink-0 items-center gap-2 text-sm font-semibold transition-colors duration-200 sm:flex",
            inverted
              ? "text-zinc-300 hover:text-white"
              : "text-zinc-600 hover:text-primary",
          )}
        >
          {action.label}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
