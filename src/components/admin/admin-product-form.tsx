"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AdminField, AdminFormSection, adminControlClass } from "./admin-form";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
import { AdminProductImages } from "./admin-product-images";
import { AdminProductVariants } from "./admin-product-variants";
import { RichTextEditor } from "./rich-text-editor";
import { RichProductContent } from "@/components/product-detail/rich-product-content";
import {
  createAdminProduct,
  getAdminProduct,
  getAdminProductReferences,
  setAdminProductActive,
  updateAdminProduct,
} from "@/lib/admin/products";
import {
  uploadProductImages,
  type PendingProductImage,
} from "@/lib/admin/product-images";
import { sanitizeRichText } from "@/lib/content/rich-text";
import { getAdminWarehouses, updateReorderLevel } from "@/lib/admin/inventory";
import type {
  AdminProductFormValues,
  AdminProductReference,
} from "@/types/admin-product";
import type { Tables } from "@/types/database";

type FormState = {
  name: string;
  slug: string;
  sku: string;
  brand_id: string;
  category_id: string;
  description: string;
  price: string;
  old_price: string;
  stock_quantity: string;
  reorder_level: string;
  warranty_months: string;
  is_active: boolean;
  is_featured: boolean;
};
type FormErrors = Partial<Record<keyof FormState, string>>;
const emptyForm: FormState = {
  name: "",
  slug: "",
  sku: "",
  brand_id: "",
  category_id: "",
  description: "",
  price: "",
  old_price: "",
  stock_quantity: "0",
  reorder_level: "5",
  warranty_months: "24",
  is_active: true,
  is_featured: false,
};
const slugify = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function AdminProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [brands, setBrands] = useState<AdminProductReference[]>([]);
  const [categories, setCategories] = useState<AdminProductReference[]>([]);
  const [images, setImages] = useState<Tables<"product_images">[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [currentProductId, setCurrentProductId] = useState(productId);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const previewDescription = useMemo(
    () => sanitizeRichText(form.description),
    [form.description],
  );
  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [references, product] = await Promise.all([
        getAdminProductReferences(),
        productId
          ? getAdminProduct(productId)
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!references.data || product.error) {
        setPageError(references.error ?? product.error ?? "Form yüklenemedi.");
        setLoading(false);
        return;
      }
      setBrands(references.data.brands);
      setCategories(references.data.categories);
      if (product.data) {
        const item = product.data;
        setForm({
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          brand_id: item.brand_id,
          category_id: item.category_id,
          description: item.description ?? "",
          price: String(item.price),
          old_price: item.old_price === null ? "" : String(item.old_price),
          stock_quantity: String(item.stock_quantity),
          reorder_level: "5",
          warranty_months: String(item.warranty_months),
          is_active: item.is_active,
          is_featured: item.is_featured,
        });
        setImages(item.images);
      } else if (productId)
        setPageError("Ürün bulunamadı veya bu kaydı görüntüleme yetkiniz yok.");
      setLoading(false);
    })();
  }, [productId]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const validate = () => {
    const next: FormErrors = {};
    const price = Number(form.price);
    const stock = Number(form.stock_quantity);
    const reorderLevel = Number(form.reorder_level);
    const oldPrice = form.old_price ? Number(form.old_price) : null;
    if (!form.name.trim()) next.name = "Ürün adı zorunludur.";
    if (!form.slug.trim()) next.slug = "Slug zorunludur.";
    if (!form.sku.trim()) next.sku = "SKU zorunludur.";
    if (!form.brand_id) next.brand_id = "Marka seçin.";
    if (!form.category_id) next.category_id = "Kategori seçin.";
    if (!Number.isFinite(price) || price <= 0)
      next.price = "Fiyat sıfırdan büyük olmalıdır.";
    if (!Number.isInteger(stock) || stock < 0)
      next.stock_quantity = "Stok negatif olamaz.";
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0)
      next.reorder_level = "Kritik stok seviyesi negatif olamaz.";
    if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice < price))
      next.old_price = "Eski fiyat güncel fiyattan düşük olamaz.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPageError("");
    setSaved(false);
    if (!validate()) return;
    setSaving(true);
    const values: AdminProductFormValues = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      brand_id: form.brand_id,
      category_id: form.category_id,
      description: sanitizeRichText(form.description) || null,
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      stock_quantity: Number(form.stock_quantity),
      warranty_months: Number(form.warranty_months),
      is_active: form.is_active,
      is_featured: form.is_featured,
    };
    const result = currentProductId
      ? await updateAdminProduct(currentProductId, values)
      : await createAdminProduct(values);
    if (!result.data) {
      setSaving(false);
      setPageError(result.error ?? "Ürün kaydedilemedi.");
      return;
    }
    setCurrentProductId(result.data.id);
    const warehouses = await getAdminWarehouses();
    const defaultWarehouse =
      warehouses.data?.find((item) => item.is_default) ?? warehouses.data?.[0];
    if (defaultWarehouse) {
      const reorder = await updateReorderLevel(
        defaultWarehouse.id,
        result.data.id,
        Number(form.reorder_level),
      );
      if (!reorder.data) setPageError(reorder.error);
    }
    if (pendingImages.length) {
      const upload = await uploadProductImages(
        result.data.id,
        pendingImages,
        images.length,
        (item) => setImageUploadProgress(item.progress),
      );
      if (!upload.data) {
        setSaving(false);
        setPageError(
          `Ürün kaydedildi ancak görseller yüklenemedi. ${upload.error ?? "Tekrar deneyin."}`,
        );
        return;
      }
      setImages((current) => [...current, ...upload.data]);
      setPendingImages([]);
      setImageUploadProgress(100);
    }
    const cacheRefresh = await setAdminProductActive(
      result.data.id,
      form.is_active,
    );
    if (!cacheRefresh.data) {
      setSaving(false);
      setPageError(
        `Ürün kaydedildi ancak katalog önbelleği yenilenemedi. ${cacheRefresh.error ?? "Tekrar deneyin."}`,
      );
      return;
    }
    setSaving(false);
    setSaved(true);
    if (!productId) router.replace(`/admin/urunler/${result.data.id}`);
    router.refresh();
  };
  if (loading) return <AdminLoadingState />;
  if (pageError && !brands.length)
    return <AdminErrorState retry={() => window.location.reload()} />;
  return (
    <form
      onSubmit={submit}
      className="grid gap-6 xl:grid-cols-[1fr_360px]"
      noValidate
    >
      <div className="space-y-6">
        {pageError ? (
          <p
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {pageError}
          </p>
        ) : null}
        <AdminFormSection
          title="Temel bilgiler"
          description="Müşterilerin katalogda göreceği ürün bilgileri."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Ürün adı"
              name="name"
              form={form}
              errors={errors}
              set={set}
              required
              onBlur={() => !form.slug && set("slug", slugify(form.name))}
              className="sm:col-span-2"
            />
            <Field
              label="SKU"
              name="sku"
              form={form}
              errors={errors}
              set={set}
              required
            />
            <SelectField
              label="Marka"
              name="brand_id"
              value={form.brand_id}
              error={errors.brand_id}
              onChange={(value) => set("brand_id", value)}
              items={brands}
            />
            <SelectField
              label="Kategori"
              name="category_id"
              value={form.category_id}
              error={errors.category_id}
              onChange={(value) => set("category_id", value)}
              items={categories}
            />
            <Field
              label="Garanti (ay)"
              name="warranty_months"
              type="number"
              form={form}
              errors={errors}
              set={set}
            />
          </div>
        </AdminFormSection>
        <AdminFormSection
          title="Açıklama"
          description="Ürün detayında eksiksiz gösterilecek içeriği yazın. Kart özeti bu metinden otomatik ve güvenli biçimde oluşturulur."
        >
          <AdminField label="Ürün açıklaması" htmlFor="description">
            <RichTextEditor
              id="description"
              ariaLabel="Ürün açıklaması"
              value={form.description}
              onChange={(value) => set("description", value)}
            />
          </AdminField>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-zinc-950">Canlı Önizleme</p>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-500 shadow-sm">
                Ürün detayı görünümü
              </span>
            </div>
            {previewDescription ? (
              <RichProductContent
                html={previewDescription}
                className="max-w-none rounded-xl bg-white p-4 text-zinc-600 shadow-sm sm:p-6"
              />
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
                İçerik yazdıkça ürün detayındaki görünümü burada göreceksiniz.
              </p>
            )}
          </div>
        </AdminFormSection>
        <AdminFormSection
          title="Fiyat"
          description="Satış ve varsa karşılaştırmalı eski fiyatı yönetin."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Fiyat (₺)"
              name="price"
              type="number"
              form={form}
              errors={errors}
              set={set}
              required
            />
            <Field
              label="Eski fiyat (₺)"
              name="old_price"
              type="number"
              form={form}
              errors={errors}
              set={set}
            />
          </div>
        </AdminFormSection>
        <AdminFormSection
          title="Stok"
          description={
            productId
              ? "Mevcut stok yalnızca Stok Yönetimi ekranındaki güvenli hareketlerle değiştirilebilir."
              : "Başlangıç stoğu varsayılan depoya kaydedilir."
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={productId ? "Kullanılabilir stok" : "Başlangıç stoğu"}
              name="stock_quantity"
              type="number"
              form={form}
              errors={errors}
              set={set}
              required
              disabled={Boolean(productId)}
            />
            <Field
              label="Kritik stok seviyesi"
              name="reorder_level"
              type="number"
              form={form}
              errors={errors}
              set={set}
              required
            />
          </div>
        </AdminFormSection>
        <AdminFormSection
          title="Görsel yönetimi"
          description="Çoklu yükleme, ana görsel ve sıralama işlemlerini yönetin."
        >
          <AdminProductImages
            productId={currentProductId}
            images={images}
            onImagesChange={setImages}
            pendingImages={pendingImages}
            onPendingImagesChange={setPendingImages}
          />
        </AdminFormSection>
        <AdminFormSection
          title="Varyantlar"
          description="Renk, depolama, fiyat, stok ve renk bazlı ortak görselleri yönetin. Varyant kullanımı isteğe bağlıdır."
        >
          <AdminProductVariants productId={currentProductId} />
        </AdminFormSection>
        <AdminFormSection
          title="SEO"
          description="Ürünün arama motorları ve paylaşılabilir adresi için kalıcı URL bilgisini yönetin."
        >
          <Field
            label="Slug"
            name="slug"
            form={form}
            errors={errors}
            set={set}
            required
          />
        </AdminFormSection>
      </div>
      <aside className="space-y-6">
        <AdminFormSection title="Yayın durumu">
          <div className="space-y-5">
            <Toggle
              label="Ürün aktif"
              description="Müşteri kataloğunda görünür."
              checked={form.is_active}
              onChange={(value) => set("is_active", value)}
            />
            <Toggle
              label="Öne çıkan ürün"
              description="Ana sayfa vitrininde kullanılabilir."
              checked={form.is_featured}
              onChange={(value) => set("is_featured", value)}
            />
          </div>
        </AdminFormSection>
        <div className="sticky top-28 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-zinc-950">
            {productId ? "Değişiklikleri yayınla" : "Ürünü kataloğa ekle"}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Kayıt Supabase üzerinde RLS yetkileriyle güvenli biçimde işlenecek.
          </p>
          {saved ? (
            <p
              className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
              role="status"
            >
              <Check className="size-4" />
              Ürün başarıyla kaydedildi
            </p>
          ) : null}
          {saving && imageUploadProgress > 0 ? (
            <div className="mt-4" role="status">
              <div className="mb-1 flex justify-between text-xs font-semibold text-zinc-600">
                <span>Görseller yükleniyor</span>
                <span>{imageUploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full bg-red-600 transition-all"
                  style={{ width: `${imageUploadProgress}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="mt-5 grid gap-2">
            <Button type="submit" className="w-full" disabled={saving}>
              <Save className="size-4" />
              {saving ? "Kaydediliyor…" : "Ürünü kaydet"}
            </Button>
            <Link
              href="/admin/urunler"
              className="inline-flex h-11 items-center justify-center rounded-full text-sm font-bold text-zinc-600 hover:bg-zinc-100"
            >
              Vazgeç
            </Link>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Field<K extends keyof FormState>({
  label,
  name,
  form,
  errors,
  set,
  type = "text",
  required,
  onBlur,
  className,
  disabled,
}: {
  label: string;
  name: K;
  form: FormState;
  errors: FormErrors;
  set: <T extends keyof FormState>(key: T, value: FormState[T]) => void;
  type?: string;
  required?: boolean;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const error = errors[name];
  return (
    <AdminField
      label={label}
      htmlFor={name}
      required={required}
      className={className}
    >
      <input
        id={name}
        type={type}
        value={String(form[name])}
        onChange={(e) => set(name, e.target.value as FormState[K])}
        onBlur={onBlur}
        min={type === "number" ? "0" : undefined}
        step={name === "price" || name === "old_price" ? "0.01" : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${adminControlClass} ${error ? "border-red-500" : ""}`}
        disabled={disabled}
      />
      {error ? (
        <p id={`${name}-error`} className="text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </AdminField>
  );
}
function SelectField({
  label,
  name,
  value,
  error,
  onChange,
  items,
}: {
  label: string;
  name: "brand_id" | "category_id";
  value: string;
  error?: string;
  onChange: (value: string) => void;
  items: AdminProductReference[];
}) {
  return (
    <AdminField label={label} htmlFor={name} required>
      <select
        id={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`${adminControlClass} ${error ? "border-red-500" : ""}`}
      >
        <option value="">Seçin</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </AdminField>
  );
}
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-bold text-zinc-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-500">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-red-600"
      />
    </label>
  );
}
