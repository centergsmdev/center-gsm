"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";

import { AdminProductImages } from "./admin-product-images";
import { AdminField, AdminFormSection, adminControlClass } from "./admin-form";
import { Button } from "@/components/ui/button";
import {
  uploadProductImages,
  type PendingProductImage,
} from "@/lib/admin/product-images";
import {
  saveAdminVariantSetup,
  type VariantColorDraft,
  type VariantDraft,
} from "@/lib/admin/product-variants";
import {
  createAdminProduct,
  getAdminProductReferences,
} from "@/lib/admin/products";
import {
  parseQuickProduct,
  quickProductSlug,
  type QuickProductDraft,
} from "@/lib/admin/quick-product";
import type { AdminProductReference } from "@/types/admin-product";

const EMPTY_DRAFT: QuickProductDraft = {
  name: "",
  slug: "",
  sku: "",
  brandId: "",
  categoryId: "",
  price: 0,
  oldPrice: null,
  stock: 25,
  warrantyMonths: 24,
  color: "",
  storageValue: null,
  storageUnit: null,
  ram: "",
  description: "",
};

export function AdminQuickProductForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [brands, setBrands] = useState<AdminProductReference[]>([]);
  const [categories, setCategories] = useState<AdminProductReference[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [createdProductId, setCreatedProductId] = useState("");

  useEffect(() => {
    void getAdminProductReferences().then((result) => {
      if (!result.data) setMessage(result.error);
      else {
        setBrands(result.data.brands);
        setCategories(result.data.categories);
      }
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof QuickProductDraft>(
    key: K,
    value: QuickProductDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const analyze = () => {
    if (!input.trim())
      return setMessage("Önce ürün bilgisini tek satır halinde yazın.");
    setDraft(parseQuickProduct(input, brands, categories));
    setMessage(
      "Bilgiler hazırlandı. Kaydetmeden önce alanları kontrol edebilirsiniz.",
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (
      !draft.name.trim() ||
      !draft.brandId ||
      !draft.categoryId ||
      draft.price <= 0 ||
      !draft.sku.trim()
    ) {
      setMessage(
        "Ürün adı, marka, kategori, fiyat ve SKU alanlarını tamamlayın.",
      );
      return;
    }
    setSaving(true);
    const created = await createAdminProduct({
      name: draft.name.trim(),
      slug: quickProductSlug(draft.slug || draft.name),
      sku: draft.sku.trim(),
      brand_id: draft.brandId,
      category_id: draft.categoryId,
      description: draft.description,
      price: draft.price,
      old_price: draft.oldPrice,
      stock_quantity: Math.max(0, Math.trunc(draft.stock)),
      warranty_months: Math.max(0, Math.trunc(draft.warrantyMonths)),
      show_installments: true,
      installment_count: 12,
      installment_note: "Taksit seçenekleri ödeme adımında görüntülenir.",
      is_active: false,
      is_featured: false,
      is_weekly_deal: false,
      is_latest_phone: false,
    });
    if (!created.data) {
      setSaving(false);
      setMessage(created.error);
      return;
    }
    setCreatedProductId(created.data.id);

    if (pendingImages.length) {
      const uploaded = await uploadProductImages(
        created.data.id,
        pendingImages,
        0,
      );
      if (!uploaded.data) {
        setSaving(false);
        setMessage(
          `Taslak oluşturuldu ancak görseller yüklenemedi: ${uploaded.error}`,
        );
        return;
      }
    }

    if (draft.color.trim() || (draft.storageValue && draft.storageUnit)) {
      const colorId = draft.color.trim() ? `new-${crypto.randomUUID()}` : null;
      const colors: VariantColorDraft[] = colorId
        ? [
            {
              id: colorId,
              name: draft.color.trim(),
              display_name: null,
              hex_code: "#A1A1AA",
              is_active: true,
              sort_order: 0,
            },
          ]
        : [];
      const variants: VariantDraft[] = [
        {
          id: `new-${crypto.randomUUID()}`,
          color_id: colorId,
          storage_value: draft.storageValue,
          storage_unit: draft.storageUnit,
          sku: `${draft.sku.trim()}-V1`,
          barcode: null,
          price: draft.price,
          old_price: draft.oldPrice,
          stock_quantity: Math.max(0, Math.trunc(draft.stock)),
          is_active: true,
          is_default: true,
          sort_order: 0,
          title: draft.name.trim(),
        },
      ];
      const savedVariants = await saveAdminVariantSetup(
        created.data.id,
        colors,
        variants,
      );
      if (!savedVariants.data) {
        setSaving(false);
        setMessage(
          `Taslak ve görseller oluşturuldu ancak varyant tamamlanamadı: ${savedVariants.error}`,
        );
        return;
      }
    }

    router.push(`/admin/urunler/${created.data.id}`);
  };

  if (loading)
    return (
      <p className="text-sm text-zinc-500">Ürün seçenekleri yükleniyor…</p>
    );

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Bu alan mevcut ürün ekleme ekranından bağımsızdır. Ürünler güvenlik için
        pasif taslak olarak oluşturulur; ardından klasik düzenleme ekranında
        kontrol edip yayınlayabilirsiniz.
      </div>

      <AdminFormSection
        title="Hızlı ürün bilgisi"
        description="Ürün bilgilerini eğik çizgi ile ayırarak tek satıra yazın."
      >
        <div className="space-y-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-28 w-full rounded-xl border border-zinc-200 p-4 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            placeholder="Örnek: Huawei nova 14 Pro / 12 GB RAM / 512 GB / Kristal Mavi / 49.999 TL"
          />
          <Button type="button" onClick={analyze} className="gap-2">
            <Sparkles className="size-4" /> Bilgileri hazırla
          </Button>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Kontrol ve düzenleme"
        description="Otomatik bulunan her alan kaydetmeden önce değiştirilebilir."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <QuickField
            label="Ürün adı"
            value={draft.name}
            onChange={(value) => update("name", value)}
            required
          />
          <QuickField
            label="Ürün adresi"
            value={draft.slug}
            onChange={(value) => update("slug", value)}
            required
          />
          <AdminField label="Marka" htmlFor="quick-brand" required>
            <select
              id="quick-brand"
              className={adminControlClass}
              value={draft.brandId}
              onChange={(event) => update("brandId", event.target.value)}
            >
              <option value="">Marka seçin</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Kategori" htmlFor="quick-category" required>
            <select
              id="quick-category"
              className={adminControlClass}
              value={draft.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
            >
              <option value="">Kategori seçin</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </AdminField>
          <QuickField
            label="Satış fiyatı"
            type="number"
            value={String(draft.price || "")}
            onChange={(value) => update("price", Number(value))}
            required
          />
          <QuickField
            label="Eski fiyat"
            type="number"
            value={draft.oldPrice ? String(draft.oldPrice) : ""}
            onChange={(value) =>
              update("oldPrice", value ? Number(value) : null)
            }
          />
          <QuickField
            label="Stok"
            type="number"
            value={String(draft.stock)}
            onChange={(value) => update("stock", Number(value))}
            required
          />
          <QuickField
            label="SKU"
            value={draft.sku}
            onChange={(value) => update("sku", value)}
            required
          />
          <QuickField
            label="Renk"
            value={draft.color}
            onChange={(value) => update("color", value)}
          />
          <QuickField
            label="RAM (bilgi)"
            value={draft.ram}
            onChange={(value) => update("ram", value)}
          />
          <QuickField
            label="Depolama değeri"
            type="number"
            value={draft.storageValue ? String(draft.storageValue) : ""}
            onChange={(value) =>
              update("storageValue", value ? Number(value) : null)
            }
          />
          <AdminField label="Depolama birimi" htmlFor="quick-storage-unit">
            <select
              id="quick-storage-unit"
              className={adminControlClass}
              value={draft.storageUnit ?? ""}
              onChange={(event) =>
                update(
                  "storageUnit",
                  event.target.value
                    ? (event.target.value as "GB" | "TB")
                    : null,
                )
              }
            >
              <option value="">Yok</option>
              <option value="GB">GB</option>
              <option value="TB">TB</option>
            </select>
          </AdminField>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Ürün görselleri"
        description="Görseller yalnızca bu taslağa yüklenir; mevcut ürün görselleri etkilenmez."
      >
        <AdminProductImages
          productId={undefined}
          images={[]}
          onImagesChange={() => undefined}
          pendingImages={pendingImages}
          onPendingImagesChange={setPendingImages}
        />
      </AdminFormSection>

      {message ? (
        <p
          role="status"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
        >
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/urunler/yeni"
          className="text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        >
          Klasik ürün ekleme ekranına geç
        </Link>
        <div className="flex items-center gap-3">
          {createdProductId ? (
            <Link
              href={`/admin/urunler/${createdProductId}`}
              className="text-sm font-bold text-red-600"
            >
              Oluşturulan taslağı aç
            </Link>
          ) : null}
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {saving ? "Taslak oluşturuluyor…" : "Taslağı oluştur"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function QuickField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  required?: boolean;
}) {
  const id = `quick-${label.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-")}`;
  return (
    <AdminField label={label} htmlFor={id} required={required}>
      <input
        id={id}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        className={adminControlClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </AdminField>
  );
}
