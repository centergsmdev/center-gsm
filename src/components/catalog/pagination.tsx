import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CatalogSearchParams } from "@/lib/catalog/params";

export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: CatalogSearchParams;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (value) =>
      value === 1 || value === totalPages || Math.abs(value - page) <= 1,
  );
  const href = (nextPage: number) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (key === "sayfa" || value === undefined) return;
      (Array.isArray(value) ? value : [value]).forEach((item) =>
        query.append(key, item),
      );
    });
    query.set("sayfa", String(nextPage));
    return `${basePath}?${query.toString()}`;
  };
  return (
    <nav
      aria-label="Ürün sayfaları"
      className="mt-10 flex items-center justify-center gap-1.5"
    >
      <PaginationLink
        href={href(Math.max(1, page - 1))}
        label="Önceki sayfa"
        disabled={page === 1}
      >
        <ChevronLeft className="size-4" />
      </PaginationLink>
      {pages.map((value, index) => (
        <span key={value} className="contents">
          {index > 0 && pages[index - 1] !== value - 1 ? (
            <span className="px-1 text-muted">…</span>
          ) : null}
          <PaginationLink
            href={href(value)}
            current={value === page}
            label={`Sayfa ${value}`}
          >
            {value}
          </PaginationLink>
        </span>
      ))}
      <PaginationLink
        href={href(Math.min(totalPages, page + 1))}
        label="Sonraki sayfa"
        disabled={page === totalPages}
      >
        <ChevronRight className="size-4" />
      </PaginationLink>
    </nav>
  );
}
function PaginationLink({
  href,
  label,
  current,
  disabled,
  children,
}: {
  href: string;
  label: string;
  current?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        "grid size-10 place-items-center rounded-md border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        current
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-border bg-surface text-zinc-600 hover:border-border-strong hover:text-foreground",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </Link>
  );
}
