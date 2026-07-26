import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="min-h-[70vh] bg-surface-subtle/50 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md px-4">
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-2 rounded-sm text-lg font-black tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="grid size-8 place-items-center rounded-md bg-zinc-950 text-xs text-white">
            C
          </span>
          CENTER<span className="-ml-2 text-primary">GSM</span>
        </Link>
        <Card className="mt-7 p-5 shadow-lg sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
            {footer}
          </div>
        </Card>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-muted">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          Oturumunuz Supabase Auth ile güvenli biçimde korunur.
        </p>
      </div>
    </main>
  );
}
