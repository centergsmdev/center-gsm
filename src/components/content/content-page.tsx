import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Container } from "@/components/ui/container";
import { sanitizeRichText } from "@/lib/content/rich-text";

export type ContentSection = { title: string; paragraphs: readonly string[] };

export function ContentPage({
  eyebrow,
  title,
  description,
  sections,
  bodyHtml,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: readonly ContentSection[];
  bodyHtml?: string;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.07),transparent_28%),linear-gradient(to_bottom,#fafafa,#fff)] py-6 sm:py-10">
        <Container>
          <nav aria-label="Sayfa yolu" className="mb-7 sm:mb-10">
            <ol className="flex items-center gap-2 text-xs text-zinc-500">
              <li>
                <Link
                  href="/"
                  aria-label="Ana sayfa"
                  className="rounded-sm hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <Home className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="font-semibold text-zinc-900" aria-current="page">
                {title}
              </li>
            </ol>
          </nav>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] lg:gap-14">
            <header>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-zinc-950 sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600 sm:text-base">
                {description}
              </p>
            </header>
            <div className="space-y-4">
              {bodyHtml ? (
                <article
                  className="rich-product-content rounded-3xl border border-zinc-200/80 bg-white p-5 text-sm leading-7 text-zinc-600 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-7"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(bodyHtml),
                  }}
                />
              ) : (
                sections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-7"
                  >
                    <h2 className="text-lg font-black tracking-[-0.025em] text-zinc-950">
                      {section.title}
                    </h2>
                    <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
