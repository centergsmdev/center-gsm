"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageSquareText, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitProductReview } from "@/lib/reviews/client";
import { cn } from "@/lib/utils";
import type { ProductReview } from "@/types/database";

export function ProductReviews({
  productId,
  rating,
  reviewCount,
  reviews,
}: {
  productId: string;
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
}) {
  const [selectedRating, setSelectedRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setMessage("");
    const result = await submitProductReview({
      productId,
      rating: selectedRating,
      title: String(data.get("title") ?? ""),
      body: String(data.get("body") ?? ""),
    });
    setSaving(false);
    if (!result.data) {
      setError(result.error ?? "Yorum gönderilemedi.");
      return;
    }
    form.reset();
    setSelectedRating(5);
    setMessage("Yorumunuz alındı. Yönetici onayından sonra yayınlanacak.");
  }

  return (
    <section
      id="yorumlar"
      aria-labelledby="reviews-title"
      className="mt-12 sm:mt-16"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
            Müşteri deneyimleri
          </p>
          <h2
            id="reviews-title"
            className="mt-2 text-2xl font-black tracking-tight"
          >
            Ürün yorumları
          </h2>
          <div className="mt-5 flex items-end gap-3">
            <span className="text-5xl font-black tracking-tight">
              {rating.toFixed(1)}
            </span>
            <div className="pb-1">
              <Stars value={rating} />
              <p className="mt-1 text-xs text-zinc-500">
                {reviewCount} onaylı yorum
              </p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <span className="text-sm font-bold">Puanınız</span>
              <div
                className="mt-2 flex gap-1"
                role="radiogroup"
                aria-label="Ürün puanı"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedRating(value)}
                    className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    role="radio"
                    aria-checked={selectedRating === value}
                    aria-label={`${value} yıldız`}
                  >
                    <Star
                      className={cn(
                        "size-6",
                        value <= selectedRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-300",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-bold">
                Başlık{" "}
                <span className="font-normal text-zinc-400">
                  (isteğe bağlı)
                </span>
              </span>
              <input
                name="title"
                maxLength={120}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                placeholder="Kısa bir başlık"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold">Yorumunuz</span>
              <textarea
                name="body"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                placeholder="Ürün deneyiminizi paylaşın…"
              />
            </label>
            {error ? (
              <p
                className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                role="alert"
              >
                {error}{" "}
                {error.includes("giriş") ? (
                  <Link href="/giris" className="underline">
                    Giriş yap
                  </Link>
                ) : null}
              </p>
            ) : null}
            {message ? (
              <p
                className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                role="status"
              >
                {message}
              </p>
            ) : null}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Gönderiliyor…" : "Yorumu gönder"}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          {reviews.length ? (
            reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-black text-zinc-950">
                    {review.author_name}
                  </p>
                  <Stars value={review.rating} />
                </div>
                {review.title ? (
                  <h3 className="mt-4 font-black">{review.title}</h3>
                ) : null}
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600">
                  {review.body}
                </p>
                {review.admin_reply ? (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50/70 p-4">
                    <p className="flex items-center gap-2 text-sm font-black text-red-700">
                      <MessageSquareText className="size-4" /> CENTER GSM yanıtı
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">
                      {review.admin_reply}
                    </p>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
              <MessageSquareText className="size-8 text-zinc-300" />
              <h3 className="mt-4 font-black">Henüz onaylı yorum yok</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Bu ürün hakkındaki deneyiminizi paylaşan ilk müşteri siz
                olabilirsiniz.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} yıldız`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "size-4",
            star <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-300",
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
