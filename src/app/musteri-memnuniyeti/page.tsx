import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Headphones,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  Star,
  Truck,
  Video,
} from "lucide-react";

import { OpenLiveChatButton } from "@/components/live-chat/open-live-chat-button";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ReviewImageGallery } from "@/components/reviews/review-image-gallery";
import { Container } from "@/components/ui/container";
import {
  parseCustomerSatisfactionQuery,
  privacySafeReviewName,
  ratingPercentage,
  withCustomerSatisfactionQuery,
  type CustomerSatisfactionQuery,
} from "@/lib/reviews/customer-satisfaction-core";
import { getCustomerSatisfactionPageData } from "@/lib/reviews/customer-satisfaction";
import { generateSeoMetadata } from "@/lib/seo/seo";
import type {
  CustomerSatisfactionReview,
  CustomerSatisfactionReviewSummary,
} from "@/types/database";

export const dynamic = "force-dynamic";

const title = "Müşteri Memnuniyeti ve Yorumlar | CENTER GSM";
const description =
  "CENTER GSM müşterilerinin gerçek ürün yorumlarını, fotoğraflı deneyimlerini ve değerlendirmelerini inceleyin.";

export const metadata = {
  ...generateSeoMetadata({
    title,
    description,
    canonical: "/musteri-memnuniyeti",
    keywords: [
      "CENTER GSM yorumları",
      "CENTER GSM müşteri memnuniyeti",
      "fotoğraflı ürün yorumları",
    ],
    social: {
      title,
      description,
      canonical: "/musteri-memnuniyeti",
      image: "/images/hero-tech.png",
    },
  }),
  title: { absolute: title },
};

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CustomerSatisfactionPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const query = parseCustomerSatisfactionQuery(await searchParams);
  const data = await getCustomerSatisfactionPageData(query);
  if (data.filteredCount > 0 && data.page !== query.page)
    redirect(withCustomerSatisfactionQuery(query, { page: data.page }));

  return (
    <>
      <Header />
      <main className="overflow-hidden bg-zinc-50">
        <section className="relative isolate overflow-hidden bg-zinc-950 py-12 text-white sm:py-16 lg:py-20">
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(239,68,68,0.28),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(16,185,129,0.17),transparent_32%)]"
            aria-hidden="true"
          />
          <Container>
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-400">
                CENTER GSM
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Müşterilerimizin Deneyimleri
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                CENTER GSM&apos;den alışveriş yapan müşterilerimizin ürünlerimiz
                ve hizmetlerimiz hakkındaki gerçek değerlendirmelerini
                inceleyin.
              </p>
            </div>
            <ReviewSummary summary={data.summary} />
          </Container>
        </section>

        <Container className="py-8 sm:py-12">
          {data.featured.length ? (
            <section aria-labelledby="featured-reviews-title">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                  <Star className="size-5 fill-current" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                    Seçili değerlendirmeler
                  </p>
                  <h2
                    id="featured-reviews-title"
                    className="text-2xl font-black tracking-[-0.035em] text-zinc-950 sm:text-3xl"
                  >
                    Öne Çıkan Müşteri Deneyimleri
                  </h2>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.featured.map((review) => (
                  <ReviewCard key={`featured-${review.id}`} review={review} />
                ))}
              </div>
            </section>
          ) : null}

          <section
            className={data.featured.length ? "mt-12 sm:mt-16" : ""}
            aria-labelledby="all-reviews-title"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Gerçek ürün deneyimleri
                </p>
                <h2
                  id="all-reviews-title"
                  className="mt-1 text-3xl font-black tracking-[-0.04em] text-zinc-950 sm:text-4xl"
                >
                  Tüm Müşteri Yorumları
                </h2>
              </div>
              <p className="text-sm font-semibold text-zinc-500">
                {data.filteredCount.toLocaleString("tr-TR")} yayınlanmış yorum
              </p>
            </div>

            <ReviewControls
              query={query}
              summary={data.summary}
              verifiedSupported={data.summary.verified_count > 0}
            />

            {data.reviews.length ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {data.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-white px-5 py-14 text-center shadow-sm">
                <MessageCircle
                  className="mx-auto size-9 text-zinc-400"
                  aria-hidden="true"
                />
                <p className="mt-4 font-black text-zinc-950">
                  {data.unavailable
                    ? "Müşteri değerlendirmeleri şu anda yüklenemiyor."
                    : data.summary.total_count === 0
                      ? "Henüz yayınlanmış müşteri değerlendirmesi bulunmuyor."
                      : "Bu filtrelere uygun yayınlanmış yorum bulunamadı."}
                </p>
              </div>
            )}

            {data.pageCount > 1 ? (
              <Pagination
                query={query}
                page={data.page}
                pageCount={data.pageCount}
              />
            ) : null}
          </section>

          <TrustSection />

          <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 text-sm leading-6 text-zinc-600 shadow-sm sm:p-7">
            <h2 className="font-black text-zinc-950">Şeffaflık notu</h2>
            <p className="mt-2">
              Bu sayfadaki değerlendirmeler CENTER GSM ürünlerine müşteriler
              tarafından gönderilen ve yayınlanması onaylanan gerçek yorumlardan
              oluşur.
            </p>
            {data.summary.verified_count > 0 ? (
              <p className="mt-2">
                Doğrulanmış Alışveriş rozeti, sistemimizde ilgili satın alma
                işlemi doğrulanabilen değerlendirmelerde gösterilir.
              </p>
            ) : null}
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl bg-zinc-950 px-5 py-8 text-white shadow-xl sm:px-9 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                  Size uygun ürünü birlikte bulalım
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                  Ürünleri inceleyebilir veya merak ettiğiniz konularda canlı
                  destek ekibimize ulaşabilirsiniz.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/urunler"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  Ürünleri İncele
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
                <OpenLiveChatButton />
              </div>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function ReviewSummary({
  summary,
}: {
  summary: CustomerSatisfactionReviewSummary;
}) {
  const average = Number(summary.average_rating || 0);
  const ratings = [5, 4, 3, 2, 1] as const;
  return (
    <div className="mt-9 grid gap-5 rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur sm:p-7 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="flex flex-col justify-center border-white/10 lg:border-r lg:pr-8">
        <div className="flex items-end gap-3">
          <span className="text-5xl font-black tracking-[-0.06em] sm:text-6xl">
            {average.toLocaleString("tr-TR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="pb-2 text-sm font-bold text-zinc-400">/ 5</span>
        </div>
        <StarRating rating={Math.round(average)} />
        <p className="mt-3 text-sm font-bold text-zinc-300">
          {summary.total_count.toLocaleString("tr-TR")} Müşteri Değerlendirmesi
        </p>
        {summary.verified_count > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
            <BadgeCheck className="size-4" aria-hidden="true" />
            {summary.verified_count.toLocaleString("tr-TR")} Doğrulanmış
            Alışveriş Yorumu
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        {ratings.map((rating) => {
          const count = summary[`rating_${rating}_count`];
          const percent = ratingPercentage(count, summary.total_count);
          return (
            <div
              key={rating}
              className="grid grid-cols-[38px_1fr_42px] items-center gap-3"
            >
              <span className="text-xs font-black text-zinc-200">
                {rating} ★
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-right text-xs font-bold text-zinc-400">
                %{percent}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, rating));
  return (
    <span
      className="mt-2 inline-flex gap-0.5 text-amber-400"
      role="img"
      aria-label={`5 üzerinden ${safeRating} yıldız`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`size-4 ${value <= safeRating ? "fill-current" : "text-zinc-300"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: CustomerSatisfactionReview }) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black text-zinc-950">
            {privacySafeReviewName(review.author_name)}
          </p>
          <time
            dateTime={review.created_at}
            className="mt-1 block text-xs text-zinc-500"
          >
            {new Intl.DateTimeFormat("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(review.created_at))}
          </time>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.verified_purchase ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-emerald-700">
          <BadgeCheck className="size-4" aria-hidden="true" />
          Doğrulanmış Alışveriş
        </p>
      ) : null}
      {review.title ? (
        <h3 className="mt-4 text-base font-black text-zinc-950">
          {review.title}
        </h3>
      ) : null}
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700">
        {review.body}
      </p>
      <ReviewImageGallery paths={review.image_paths} />
      {review.admin_reply ? (
        <div className="mt-5 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
            CENTER GSM Yanıtı
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">
            {review.admin_reply}
          </p>
        </div>
      ) : null}
      <Link
        href={`/urun/${review.product_slug}`}
        className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-100">
          {review.product_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.product_image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-contain"
            />
          ) : (
            <Package className="size-5 text-zinc-400" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold text-zinc-500">
            İncelenen ürün
          </span>
          <span className="mt-0.5 block truncate text-sm font-black text-zinc-950">
            {review.product_name}
          </span>
        </span>
        <ChevronRight
          className="ml-auto size-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
}

function ReviewControls({
  query,
  summary,
  verifiedSupported,
}: {
  query: CustomerSatisfactionQuery;
  summary: CustomerSatisfactionReviewSummary;
  verifiedSupported: boolean;
}) {
  const filters = [
    { label: "Tümü", rating: null, filter: "all" as const },
    ...([5, 4, 3, 2, 1] as const).map((rating) => ({
      label: `${rating} Yıldız`,
      rating,
      filter: "all" as const,
    })),
    { label: "Fotoğraflı Yorumlar", rating: null, filter: "photos" as const },
    ...(verifiedSupported
      ? [
          {
            label: "Doğrulanmış Alışveriş",
            rating: null,
            filter: "verified" as const,
          },
        ]
      : []),
  ];
  return (
    <div className="mt-6 space-y-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Yorum filtreleri"
      >
        {filters.map((filter) => {
          const active =
            query.rating === filter.rating && query.filter === filter.filter;
          return (
            <Link
              key={filter.label}
              href={withCustomerSatisfactionQuery(query, {
                page: 1,
                rating: filter.rating,
                filter: filter.filter,
              })}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                active
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {filter.label}
              {filter.filter === "photos" ? ` (${summary.photo_count})` : ""}
            </Link>
          );
        })}
      </div>
      <form
        action="/musteri-memnuniyeti"
        method="get"
        className="grid gap-3 sm:grid-cols-[1fr_190px_auto]"
      >
        {query.rating ? (
          <input type="hidden" name="rating" value={query.rating} />
        ) : null}
        {query.filter !== "all" ? (
          <input type="hidden" name="filter" value={query.filter} />
        ) : null}
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3 focus-within:border-zinc-500">
          <Search className="size-4 text-zinc-400" aria-hidden="true" />
          <span className="sr-only">Ürünlerde ara</span>
          <input
            type="search"
            name="search"
            defaultValue={query.search}
            maxLength={80}
            placeholder="Ürünlerde ara"
            className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Yorumları sırala</span>
          <select
            name="sort"
            defaultValue={query.sort}
            className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-800 outline-none focus:border-zinc-500 sm:text-sm"
          >
            <option value="newest">En Yeni</option>
            <option value="highest">En Yüksek Puan</option>
            <option value="lowest">En Düşük Puan</option>
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          Uygula
        </button>
      </form>
    </div>
  );
}

function Pagination({
  query,
  page,
  pageCount,
}: {
  query: CustomerSatisfactionQuery;
  page: number;
  pageCount: number;
}) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => start + index,
  );
  return (
    <nav
      className="mt-8 flex items-center justify-center gap-2"
      aria-label="Yorum sayfaları"
    >
      {page > 1 ? (
        <Link
          href={withCustomerSatisfactionQuery(query, { page: page - 1 })}
          className="grid size-11 place-items-center rounded-xl border border-zinc-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="Önceki yorum sayfası"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      {pages.map((value) => (
        <Link
          key={value}
          href={withCustomerSatisfactionQuery(query, { page: value })}
          aria-current={value === page ? "page" : undefined}
          className={`grid size-11 place-items-center rounded-xl border text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
            value === page
              ? "border-zinc-950 bg-zinc-950 text-white"
              : "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          {value}
        </Link>
      ))}
      {page < pageCount ? (
        <Link
          href={withCustomerSatisfactionQuery(query, { page: page + 1 })}
          className="grid size-11 place-items-center rounded-xl border border-zinc-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="Sonraki yorum sayfası"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}

function TrustSection() {
  const cards = [
    {
      title: "Canlı Destek",
      description:
        "Satış öncesi ve sonrası canlı destek ekibimizle iletişim kurabilirsiniz.",
      icon: Headphones,
    },
    {
      title: "Görüntülü Destek",
      description:
        "Gerekli durumlarda müşteri temsilcimizle görüntülü görüşme gerçekleştirebilirsiniz.",
      icon: Video,
    },
    {
      title: "Sipariş Takibi",
      description:
        "Siparişinizin durumunu sistem üzerinden takip edebilirsiniz.",
      icon: Truck,
    },
    {
      title: "Garanti Bilgisi",
      description:
        "Ürünlerin garanti bilgilerini satın almadan önce inceleyebilirsiniz.",
      icon: ShieldCheck,
    },
    {
      title: "Güvenli Ödeme",
      description:
        "Ödeme adımında size sunulan güvenli ödeme seçeneklerini inceleyebilirsiniz.",
      icon: CreditCard,
    },
    {
      title: "Elden Taksit",
      description:
        "Uygun ürünlerde ödeme planınızı önceden görüntüleyerek elden taksit başvurusu yapabilirsiniz.",
      icon: BadgeCheck,
    },
  ];
  return (
    <section className="mt-14 sm:mt-20" aria-labelledby="trust-title">
      <div className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Destek ve şeffaflık
        </p>
        <h2
          id="trust-title"
          className="mt-1 text-3xl font-black tracking-[-0.04em] text-zinc-950 sm:text-4xl"
        >
          CENTER GSM&apos;de Güvenli Alışveriş
        </h2>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, description, icon: Icon }) => (
          <article
            key={title}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-black uppercase tracking-[0.06em] text-zinc-950">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
