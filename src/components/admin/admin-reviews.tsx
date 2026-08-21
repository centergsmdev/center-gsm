"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  MessageSquareReply,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import { AdminModal } from "@/components/admin/admin-modal";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { ReviewImageGallery } from "@/components/reviews/review-image-gallery";
import { ReviewImagePicker } from "@/components/reviews/review-image-picker";
import {
  createAdminReview,
  getAdminReviews,
  getReviewProducts,
  manageAdminReview,
  revalidateProductReviews,
} from "@/lib/reviews/client";
import type { ProductReview, Tables } from "@/types/database";

type ProductOption = Pick<Tables<"products">, "id" | "name" | "slug">;

export function AdminReviews() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProductReview["status"]>("all");
  const [creating, setCreating] = useState(false);
  const [replying, setReplying] = useState<ProductReview | null>(null);
  const [deleting, setDeleting] = useState<ProductReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [createImages, setCreateImages] = useState<File[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [reviewResult, productResult] = await Promise.all([
      getAdminReviews(),
      getReviewProducts(),
    ]);
    setLoading(false);
    if (!reviewResult.data || !productResult.data) {
      setError(
        reviewResult.error ?? productResult.error ?? "Yorumlar yüklenemedi.",
      );
      return;
    }
    setReviews(reviewResult.data);
    setProducts(productResult.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productNames = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products],
  );
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return reviews.filter((review) => {
      if (status !== "all" && review.status !== status) return false;
      if (!normalized) return true;
      return [
        review.author_name,
        review.title ?? "",
        review.body,
        productNames.get(review.product_id) ?? "",
      ].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalized));
    });
  }, [productNames, query, reviews, status]);

  async function action(review: ProductReview, next: "approve" | "reject") {
    setSaving(true);
    const result = await manageAdminReview(review.id, next);
    setSaving(false);
    if (!result.data) return setError(result.error ?? "İşlem tamamlanamadı.");
    await revalidateProductReviews(review.product_id);
    setNotice(
      next === "approve"
        ? "Yorum yayınlandı; ürün puanı güncellendi."
        : "Yorum reddedildi; müşteri tarafında gösterilmeyecek.",
    );
    await load();
  }

  async function saveReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replying) return;
    const reply = String(new FormData(event.currentTarget).get("reply") ?? "");
    setSaving(true);
    const result = await manageAdminReview(replying.id, "reply", reply);
    setSaving(false);
    if (!result.data) return setError(result.error ?? "Yanıt kaydedilemedi.");
    await revalidateProductReviews(replying.product_id);
    setReplying(null);
    setNotice("CENTER GSM yanıtı yayınlandı.");
    await load();
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    const result = await manageAdminReview(deleting.id, "delete");
    setSaving(false);
    if (!result.data) return setError(result.error ?? "Yorum silinemedi.");
    await revalidateProductReviews(deleting.product_id);
    setDeleting(null);
    setNotice("Yorum silindi; ürün puanı yeniden hesaplandı.");
    await load();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    const result = await createAdminReview({
      productId: String(data.get("productId") ?? ""),
      authorName: String(data.get("authorName") ?? ""),
      rating: Number(data.get("rating") ?? 5),
      title: String(data.get("title") ?? ""),
      body: String(data.get("body") ?? ""),
      status: String(
        data.get("status") ?? "approved",
      ) as ProductReview["status"],
      imageFiles: createImages,
    });
    setSaving(false);
    if (!result.data) return setError(result.error ?? "Yorum oluşturulamadı.");
    await revalidateProductReviews(String(data.get("productId") ?? ""));
    setCreating(false);
    setCreateImages([]);
    setNotice("Yönetici yorumu oluşturuldu.");
    await load();
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error && reviews.length ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <AdminCard>
        <AdminCardHeader
          title="Ürün yorumları"
          description={`${reviews.length} yorum · Müşteri yorumlarını onaylayın, yanıtlayın veya kendiniz oluşturun.`}
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Yeni yorum
            </Button>
          }
        />
        <div className="grid gap-3 border-b border-zinc-100 p-4 md:grid-cols-[1fr_200px]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3">
            <Search className="size-4 text-zinc-400" />
            <span className="sr-only">Yorum ara</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün, müşteri veya yorum ara…"
              className="w-full text-sm outline-none"
            />
          </label>
          <select
            aria-label="Yorum durumu"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className={adminControlClass}
          >
            <option value="all">Tüm durumlar</option>
            <option value="pending">Onay bekleyen</option>
            <option value="approved">Yayında</option>
            <option value="rejected">Reddedilen</option>
          </select>
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : error && !reviews.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : visible.length ? (
          <AdminTable label="Ürün yorumu yönetimi">
            <thead>
              <tr>
                <AdminTh>Ürün / müşteri</AdminTh>
                <AdminTh>Puan</AdminTh>
                <AdminTh>Yorum</AdminTh>
                <AdminTh>Durum</AdminTh>
                <AdminTh className="text-right">İşlem</AdminTh>
              </tr>
            </thead>
            <tbody>
              {visible.map((review) => (
                <tr key={review.id}>
                  <AdminTd>
                    <p className="max-w-56 font-bold text-zinc-950">
                      {productNames.get(review.product_id) ?? "Ürün"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {review.author_name}
                      {review.is_admin_created ? " · Yönetici oluşturdu" : ""}
                    </p>
                  </AdminTd>
                  <AdminTd>
                    <span className="inline-flex items-center gap-1 font-black">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {review.rating}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <p className="max-w-md font-bold text-zinc-900">
                      {review.title || "Başlıksız yorum"}
                    </p>
                    <p className="mt-1 line-clamp-2 max-w-md text-xs leading-5 text-zinc-500">
                      {review.body}
                    </p>
                    <ReviewImageGallery paths={review.image_paths} compact />
                    {review.admin_reply ? (
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        Yanıtlandı
                      </p>
                    ) : null}
                  </AdminTd>
                  <AdminTd>
                    <StatusBadge status={review.status} />
                  </AdminTd>
                  <AdminTd>
                    <div className="flex justify-end gap-1">
                      {review.status !== "approved" ? (
                        <IconButton
                          label="Yayınla"
                          onClick={() => void action(review, "approve")}
                        >
                          <Check className="size-4" />
                        </IconButton>
                      ) : null}
                      {review.status !== "rejected" ? (
                        <IconButton
                          label="Reddet"
                          onClick={() => void action(review, "reject")}
                        >
                          <X className="size-4" />
                        </IconButton>
                      ) : null}
                      <IconButton
                        label="Yanıtla"
                        onClick={() => setReplying(review)}
                      >
                        <MessageSquareReply className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Sil"
                        danger
                        onClick={() => setDeleting(review)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="Yorum bulunamadı"
            description="Filtreleri değiştirin veya yönetici olarak yeni yorum oluşturun."
            action={() => setCreating(true)}
          />
        )}
      </AdminCard>
      <AdminModal
        open={creating}
        onClose={() => {
          if (!saving) {
            setCreating(false);
            setCreateImages([]);
          }
        }}
        title="Müşteri görünümünde yorum oluştur"
        description="Bu yorum seçtiğiniz müşteri adıyla ürün sayfasında gösterilir."
      >
        <form onSubmit={create} className="space-y-4">
          <Field label="Ürün">
            <select name="productId" required className={adminControlClass}>
              <option value="">Ürün seçin</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Müşteri adı">
              <input
                name="authorName"
                required
                minLength={2}
                maxLength={80}
                className={adminControlClass}
              />
            </Field>
            <Field label="Puan">
              <select
                name="rating"
                defaultValue="5"
                className={adminControlClass}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} yıldız
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Başlık (isteğe bağlı)">
            <input name="title" maxLength={120} className={adminControlClass} />
          </Field>
          <Field label="Yorum">
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className={`${adminControlClass} h-auto py-3`}
            />
          </Field>
          <ReviewImagePicker
            files={createImages}
            onChange={setCreateImages}
            disabled={saving}
          />
          <Field label="İlk durum">
            <select
              name="status"
              defaultValue="approved"
              className={adminControlClass}
            >
              <option value="approved">Doğrudan yayınla</option>
              <option value="pending">Onay beklesin</option>
            </select>
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Kaydediliyor…" : "Yorumu oluştur"}
          </Button>
        </form>
      </AdminModal>
      <AdminModal
        open={Boolean(replying)}
        onClose={() => !saving && setReplying(null)}
        title="Müşteri yorumunu yanıtla"
        description={
          replying
            ? `${replying.author_name} adlı müşteriye CENTER GSM yanıtı`
            : ""
        }
      >
        <form onSubmit={saveReply} className="space-y-4">
          <textarea
            name="reply"
            required
            minLength={2}
            maxLength={2000}
            rows={6}
            defaultValue={replying?.admin_reply ?? ""}
            className={`${adminControlClass} h-auto py-3`}
          />
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Kaydediliyor…" : "Yanıtı yayınla"}
          </Button>
        </form>
      </AdminModal>
      <AdminModal
        open={Boolean(deleting)}
        onClose={() => !saving && setDeleting(null)}
        title="Yorum kalıcı olarak silinsin mi?"
        description="Silinen yorum geri getirilemez; ürün puanı otomatik yeniden hesaplanır."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={() => void remove()}
              disabled={saving}
            >
              {saving ? "Siliniyor…" : "Yorumu sil"}
            </Button>
          </>
        }
      />
    </div>
  );
}

function StatusBadge({ status }: { status: ProductReview["status"] }) {
  return status === "approved" ? (
    <AdminBadge variant="success">Yayında</AdminBadge>
  ) : status === "rejected" ? (
    <AdminBadge variant="danger">Reddedildi</AdminBadge>
  ) : (
    <AdminBadge variant="warning">Onay bekliyor</AdminBadge>
  );
}
function IconButton({
  label,
  children,
  onClick,
  danger = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-zinc-100"}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
