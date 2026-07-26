import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function OrderTrackingBreadcrumb({
  current = "Sipariş Takip",
}: {
  current?: string;
}) {
  return (
    <nav
      aria-label="Sayfa yolu"
      className="flex items-center gap-2 text-xs text-muted"
    >
      <Link
        href="/"
        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="sr-only">Ana sayfa</span>
        <Home className="size-3.5" aria-hidden="true" />
      </Link>
      <ChevronRight className="size-3" aria-hidden="true" />
      {current !== "Sipariş Takip" ? (
        <>
          <Link
            href="/siparis-takip"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Sipariş Takip
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
        </>
      ) : null}
      <span aria-current="page" className="font-semibold text-foreground">
        {current}
      </span>
    </nav>
  );
}
