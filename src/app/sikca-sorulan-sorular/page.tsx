import Link from "next/link";
import {
  ChevronRight,
  HelpCircle,
  Home,
  MapPin,
  MessageCircle,
} from "lucide-react";

import { FaqExplorer } from "@/components/faq/faq-explorer";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Container } from "@/components/ui/container";
import { getPublishedFaqs } from "@/lib/faqs/data";
import { generateSeoMetadata } from "@/lib/seo/seo";
import { JsonLd } from "@/lib/seo/schema";

export const dynamic = "force-dynamic";
export const metadata = generateSeoMetadata({
  title: "Sık Sorulan Sorular",
  description:
    "CENTER GSM elden taksit, kredi kartı, peşinat, ödeme, gerekli evraklar ve mağaza hakkında sık sorulan soruların yanıtları.",
  canonical: "/sikca-sorulan-sorular",
  keywords: [
    "elden taksit soruları",
    "CENTER GSM ödeme",
    "elden taksit evrakları",
  ],
});

export default async function FrequentlyAskedQuestionsPage() {
  const items = await getPublishedFaqs();
  const faqSchema = {
    "@context": "https://schema.org" as const,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <JsonLd id="faq-schema" data={faqSchema} />
      <Header />
      <main className="min-h-[65vh] bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.08),transparent_30%),linear-gradient(to_bottom,#fafafa,#fff)] py-5 sm:py-9">
        <Container>
          <nav aria-label="Sayfa yolu">
            <ol className="flex items-center gap-2 text-xs text-zinc-500">
              <li>
                <Link
                  href="/"
                  aria-label="Ana sayfa"
                  className="hover:text-zinc-950"
                >
                  <Home className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="font-semibold text-zinc-900" aria-current="page">
                Sık Sorulan Sorular
              </li>
            </ol>
          </nav>

          <header className="mt-6 overflow-hidden rounded-3xl bg-zinc-950 px-5 py-8 text-white shadow-xl sm:px-9 sm:py-12">
            <div className="flex max-w-4xl items-start gap-4 sm:gap-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-600 shadow-lg shadow-red-950/30 sm:size-14">
                <HelpCircle className="size-6 sm:size-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400 sm:text-xs">
                  CENTER GSM bilgi merkezi
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
                  Sık Sorulan Sorular
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                  Elden taksit başvurusu, gerekli evraklar, peşinat, kredi kartı
                  ve ödeme süreçleriyle ilgili kısa ve açık yanıtları burada
                  bulabilirsiniz.
                </p>
              </div>
            </div>
          </header>

          <FaqExplorer items={items} />

          <section className="mt-7 grid gap-4 pb-7 sm:mt-9 sm:grid-cols-2 sm:pb-10">
            <Link
              href="/iletisim"
              className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-black text-zinc-950">
                  Başka bir sorunuz mu var?
                </span>
                <span className="mt-1 block text-sm text-zinc-500">
                  İletişim ve destek seçeneklerini görüntüleyin.
                </span>
              </span>
            </Link>
            <Link
              href="/magazalarimiz"
              className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-red-50 text-red-600">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-black text-zinc-950">
                  Mağaza bilgileri
                </span>
                <span className="mt-1 block text-sm text-zinc-500">
                  Adres ve güncel iletişim bilgilerini inceleyin.
                </span>
              </span>
            </Link>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
