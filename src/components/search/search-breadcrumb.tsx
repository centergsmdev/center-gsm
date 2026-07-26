import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function SearchBreadcrumb() {
  return (
    <nav aria-label="Sayfa yolu">
      <ol className="flex items-center gap-2 text-xs text-muted">
        <li>
          <Link
            href="/"
            aria-label="Ana sayfa"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Home className="size-3.5" aria-hidden="true" />
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="font-semibold text-foreground" aria-current="page">
          Arama
        </li>
      </ol>
    </nav>
  );
}
