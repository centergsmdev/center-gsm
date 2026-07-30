"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ImageIcon,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminProductImages } from "./admin-product-images";
import { adminControlClass } from "./admin-form";
import {
  getAdminVariantSetup,
  saveAdminVariantSetup,
  type VariantColorDraft,
  type VariantDraft,
  type VariantStorageOption,
} from "@/lib/admin/product-variants";
import {
  applyBulkVariantUpdate,
  buildVariantCombinations,
  type BulkVariantAction,
  validateVariantSetup,
} from "@/lib/admin/variant-combinations";
import {
  uploadProductImages,
  type PendingProductImage,
} from "@/lib/admin/product-images";
import type { Tables } from "@/types/database";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function AdminProductVariants({ productId }: { productId?: string }) {
  const [colors, setColors] = useState<VariantColorDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [images, setImages] = useState<Tables<"product_images">[]>([]);
  const [storages, setStorages] = useState<VariantStorageOption[]>([]);
  const [storageValue, setStorageValue] = useState("128");
  const [storageUnit, setStorageUnit] = useState<"GB" | "TB">("GB");
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [variantSearch, setVariantSearch] = useState("");
  const [bulkAction, setBulkAction] = useState<BulkVariantAction>("add-tax");
  const [bulkValue, setBulkValue] = useState("18");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!productId) return;
    void getAdminVariantSetup(productId).then((result) => {
      if (!result.data) setMessage(result.error);
      else {
        setColors(result.data.colors);
        setVariants(result.data.variants);
        setImages(result.data.images);
        setStorages([
          ...new Map(
            result.data.variants.flatMap((variant) =>
              variant.storage_value && variant.storage_unit
                ? [
                    [
                      `${variant.storage_value}-${variant.storage_unit}`,
                      {
                        value: variant.storage_value,
                        unit: variant.storage_unit,
                      },
                    ],
                  ]
                : [],
            ),
          ).values(),
        ]);
      }
      setLoading(false);
    });
  }, [productId]);

  const addColor = () =>
    setColors((current) => [
      ...current,
      {
        id: `new-${crypto.randomUUID()}`,
        name: "Yeni renk",
        display_name: null,
        hex_code: "#000000",
        is_active: true,
        sort_order: current.length,
      },
    ]);
  const addStorage = () => {
    const value = Number(storageValue);
    if (!Number.isInteger(value) || value <= 0)
      return setMessage(
        "Depolama değeri sıfırdan büyük bir tam sayı olmalıdır.",
      );
    if (
      storages.some((item) => item.value === value && item.unit === storageUnit)
    )
      return setMessage("Bu depolama seçeneği zaten mevcut.");
    setStorages((current) => [...current, { value, unit: storageUnit }]);
    setMessage("");
  };
  const generate = () => {
    const activeColors = colors.filter((color) => color.is_active);
    if (!activeColors.length || !storages.length)
      return setMessage(
        "Kombinasyon üretmek için en az bir aktif renk ve depolama seçeneği ekleyin.",
      );
    const next = buildVariantCombinations(
      activeColors,
      storages,
      variants,
      () => crypto.randomUUID(),
    );
    setVariants(next);
    setShowPreview(true);
    setMessage(`${next.length} renk/depolama kombinasyonu hazırlandı.`);
  };

  const filteredVariants = useMemo(() => {
    const query = variantSearch.trim().toLocaleLowerCase("tr-TR");
    if (!query) return variants;
    return variants.filter((variant) => {
      const color = colors.find((item) => item.id === variant.color_id);
      return [
        color?.name,
        color?.display_name,
        variant.storage_value,
        variant.storage_unit,
        variant.sku,
        variant.barcode,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query);
    });
  }, [colors, variantSearch, variants]);

  const applyBulk = () => {
    const value = Number(bulkValue);
    if (!Number.isFinite(value)) {
      setMessage("Toplu işlem için geçerli bir sayı girin.");
      return;
    }
    setVariants((current) =>
      applyBulkVariantUpdate(current, bulkAction, value),
    );
    setMessage(`${variants.length} varyanta toplu işlem uygulandı.`);
  };

  const validationError = useMemo(
    () => validateVariantSetup(colors, variants),
    [colors, variants],
  );
  const save = async () => {
    if (!productId || validationError)
      return setMessage(validationError || "Önce ürünü kaydedin.");
    setSaving(true);
    const result = await saveAdminVariantSetup(productId, colors, variants);
    setSaving(false);
    if (!result.data) return setMessage(result.error);
    setColors(result.data.colors);
    setVariants(result.data.variants);
    setMessage("Varyantlar başarıyla kaydedildi.");
  };

  if (!productId)
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
        Varyant ve renk görsellerini yönetmek için önce temel ürünü kaydedin.
      </div>
    );
  if (loading)
    return <div className="h-28 animate-pulse rounded-xl bg-zinc-100" />;

  return (
    <div className="space-y-7">
      {message ? (
        <p
          className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700"
          role="status"
        >
          {message}
        </p>
      ) : null}
      <section className="space-y-3" aria-labelledby="variant-colors-title">
        <div className="flex items-center justify-between">
          <div>
            <h3 id="variant-colors-title" className="text-sm font-bold">
              Renkler
            </h3>
            <p className="text-xs text-zinc-500">
              HEX kodlu ürün renklerini ve swatch görünümünü yönetin.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addColor}>
            <Plus className="size-4" />
            Renk ekle
          </Button>
        </div>
        <div className="space-y-2">
          {colors.map((color, index) => (
            <ColorRow
              key={color.id}
              color={color}
              onChange={(next) =>
                setColors((current) =>
                  current.map((item) => (item.id === color.id ? next : item)),
                )
              }
              onDelete={() => {
                if (images.some((image) => image.color_id === color.id)) {
                  setMessage(
                    "Rengi silmeden önce renk bazlı görsellerini silin.",
                  );
                  return;
                }
                setColors((current) =>
                  current.filter((item) => item.id !== color.id),
                );
                setVariants((current) =>
                  current.filter((item) => item.color_id !== color.id),
                );
              }}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="variant-storage-title">
        <div>
          <h3 id="variant-storage-title" className="text-sm font-bold">
            Depolama
          </h3>
          <p className="text-xs text-zinc-500">
            Değer ve birim ayrı, normalize edilmiş alanlarda saklanır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {storages.map((storage) => (
            <span
              key={`${storage.value}-${storage.unit}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold"
            >
              {storage.value} {storage.unit}
              <button
                type="button"
                aria-label={`${storage.value} ${storage.unit} kaldır`}
                onClick={() => {
                  setStorages((current) =>
                    current.filter((item) => item !== storage),
                  );
                  setVariants((current) =>
                    current.filter(
                      (variant) =>
                        variant.storage_value !== storage.value ||
                        variant.storage_unit !== storage.unit,
                    ),
                  );
                }}
              >
                <Trash2 className="size-3.5 text-zinc-400" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex max-w-sm gap-2">
          <input
            type="number"
            min="1"
            value={storageValue}
            onChange={(event) => setStorageValue(event.target.value)}
            className={adminControlClass}
            aria-label="Depolama değeri"
          />
          <select
            value={storageUnit}
            onChange={(event) =>
              setStorageUnit(event.target.value as "GB" | "TB")
            }
            className={`${adminControlClass} w-24`}
            aria-label="Depolama birimi"
          >
            <option>GB</option>
            <option>TB</option>
          </select>
          <Button type="button" variant="outline" onClick={addStorage}>
            Ekle
          </Button>
        </div>
      </section>

      <section
        className="space-y-3"
        aria-labelledby="variant-combinations-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="variant-combinations-title" className="text-sm font-bold">
              Varyant kombinasyonları
            </h3>
            <p className="text-xs text-zinc-500">
              Her kombinasyon fiyat, stok, SKU ve barkod bakımından bağımsızdır.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={generate}>
            <Sparkles className="size-4" />
            Varyantları Oluştur
          </Button>
        </div>
        {showPreview && variants.length ? (
          <VariantPreview
            variants={variants}
            colors={colors}
            onClose={() => setShowPreview(false)}
          />
        ) : null}
        {variants.length ? (
          <>
            <BulkVariantToolbar
              search={variantSearch}
              onSearch={setVariantSearch}
              action={bulkAction}
              onAction={setBulkAction}
              value={bulkValue}
              onValue={setBulkValue}
              onApply={applyBulk}
            />
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
                <thead className="bg-zinc-950 text-white">
                  <tr>
                    {[
                      "Renk",
                      "Depolama",
                      "SKU",
                      "Barkod",
                      "Fiyat",
                      "Eski Fiyat",
                      "Stok",
                      "Aktif",
                      "Varsayılan",
                      "",
                    ].map((title) => (
                      <th
                        key={title || "actions"}
                        className="px-3 py-3 font-bold"
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredVariants.map((variant, index) => (
                    <VariantTableRow
                      key={variant.id}
                      variant={variant}
                      color={colors.find(
                        (item) => item.id === variant.color_id,
                      )}
                      onChange={(next) =>
                        setVariants((current) =>
                          current.map((item) =>
                            item.id === variant.id ? next : item,
                          ),
                        )
                      }
                      onDefault={() =>
                        setVariants((current) =>
                          current.map((item) => ({
                            ...item,
                            is_default: item.id === variant.id,
                          })),
                        )
                      }
                      onDelete={() =>
                        setVariants((current) =>
                          current.filter((item) => item.id !== variant.id),
                        )
                      }
                      index={index}
                    />
                  ))}
                </tbody>
              </table>
              {!filteredVariants.length ? (
                <p className="p-6 text-center text-sm text-zinc-500">
                  Aramanızla eşleşen varyant bulunamadı.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      {colors.filter((color) => !color.id.startsWith("new-")).length ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-bold">Renk bazlı görseller</h3>
            <p className="text-xs text-zinc-500">
              Aynı rengin tüm depolama varyantları bu ortak galeriyi kullanır.
            </p>
          </div>
          {colors
            .filter((color) => !color.id.startsWith("new-"))
            .map((color) => (
              <ColorImageManager
                key={color.id}
                productId={productId}
                color={color}
                images={images.filter((image) => image.color_id === color.id)}
                onImages={(next) =>
                  setImages((current) => [
                    ...current.filter((image) => image.color_id !== color.id),
                    ...next,
                  ])
                }
              />
            ))}
        </section>
      ) : null}

      <div className="flex items-center justify-between border-t border-zinc-100 pt-5">
        <p className="text-xs font-semibold text-red-600">{validationError}</p>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || Boolean(validationError)}
        >
          <Save className="size-4" />
          {saving ? "Kaydediliyor…" : "Varyantları kaydet"}
        </Button>
      </div>
    </div>
  );
}

function ColorRow({
  color,
  onChange,
  onDelete,
  index,
}: {
  color: VariantColorDraft;
  onChange: (value: VariantColorDraft) => void;
  onDelete: () => void;
  index: number;
}) {
  return (
    <div className="grid items-center gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-[44px_1fr_1fr_130px_80px_auto_auto]">
      <span
        className="size-9 rounded-full border border-zinc-300 shadow-inner"
        style={{
          backgroundColor: HEX_PATTERN.test(color.hex_code)
            ? color.hex_code
            : "transparent",
        }}
      />
      <input
        value={color.name}
        onChange={(event) => onChange({ ...color, name: event.target.value })}
        className={adminControlClass}
        aria-label={`Renk ${index + 1} adı`}
        placeholder="Renk adı"
      />
      <input
        value={color.display_name ?? ""}
        onChange={(event) =>
          onChange({ ...color, display_name: event.target.value || null })
        }
        className={adminControlClass}
        aria-label={`Renk ${index + 1} özel adı`}
        placeholder="Özel ad (opsiyonel)"
      />
      <input
        value={color.hex_code}
        onChange={(event) =>
          onChange({ ...color, hex_code: event.target.value })
        }
        className={`${adminControlClass} font-mono ${HEX_PATTERN.test(color.hex_code) ? "" : "border-red-500"}`}
        aria-label={`Renk ${index + 1} HEX kodu`}
      />
      <input
        type="number"
        min="0"
        value={color.sort_order}
        onChange={(event) =>
          onChange({
            ...color,
            sort_order: Math.max(0, Number(event.target.value)),
          })
        }
        className={adminControlClass}
        aria-label={`Renk ${index + 1} sırası`}
      />
      <label className="flex items-center gap-2 text-xs font-bold">
        <input
          type="checkbox"
          checked={color.is_active}
          onChange={(event) =>
            onChange({ ...color, is_active: event.target.checked })
          }
          className="size-4 accent-red-600"
        />
        Aktif
      </label>
      <button
        type="button"
        onClick={onDelete}
        className="grid size-9 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
        aria-label={`${color.name} rengini sil`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function VariantPreview({
  variants,
  colors,
  onClose,
}: {
  variants: VariantDraft[];
  colors: VariantColorDraft[];
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-emerald-900">
          Oluşturulacak {variants.length} kombinasyon
        </p>
        <button
          type="button"
          className="text-xs font-bold text-emerald-800 underline"
          onClick={onClose}
        >
          Önizlemeyi kapat
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {variants.map((variant) => {
          const color = colors.find((item) => item.id === variant.color_id);
          return (
            <div
              key={`preview-${variant.id}`}
              className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
            >
              <Check className="size-4 shrink-0 text-emerald-600" />
              <span
                className="size-4 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: color?.hex_code }}
              />
              {color?.display_name || color?.name} · {variant.storage_value}{" "}
              {variant.storage_unit}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkVariantToolbar({
  search,
  onSearch,
  action,
  onAction,
  value,
  onValue,
  onApply,
}: {
  search: string;
  onSearch: (value: string) => void;
  action: BulkVariantAction;
  onAction: (value: BulkVariantAction) => void;
  value: string;
  onValue: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-[minmax(220px,1fr)_180px_140px_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className={`${adminControlClass} pl-9`}
          placeholder="Renk, GB, SKU veya barkod ara"
          aria-label="Varyant ara"
        />
      </label>
      <select
        value={action}
        onChange={(event) => onAction(event.target.value as BulkVariantAction)}
        className={adminControlClass}
        aria-label="Toplu işlem"
      >
        <option value="add-tax">KDV ekle (%)</option>
        <option value="adjust-price">Fiyat artır / azalt</option>
        <option value="set-old-price">Eski fiyat belirle</option>
        <option value="set-stock">Stok belirle</option>
      </select>
      <input
        type="number"
        step={action === "set-stock" ? 1 : "0.01"}
        value={value}
        onChange={(event) => onValue(event.target.value)}
        className={adminControlClass}
        aria-label="Toplu işlem değeri"
      />
      <Button type="button" variant="outline" onClick={onApply}>
        Tümüne uygula
      </Button>
    </div>
  );
}

function VariantTableRow({
  variant,
  color,
  onChange,
  onDefault,
  onDelete,
  index,
}: {
  variant: VariantDraft;
  color?: VariantColorDraft;
  onChange: (value: VariantDraft) => void;
  onDefault: () => void;
  onDelete: () => void;
  index: number;
}) {
  const input = (
    field: "sku" | "barcode" | "price" | "old_price" | "stock_quantity",
    type = "text",
  ) => (
    <input
      type={type}
      min={type === "number" ? 0 : undefined}
      value={variant[field] ?? ""}
      onChange={(event) =>
        onChange({
          ...variant,
          [field]:
            type === "number"
              ? event.target.value === ""
                ? null
                : Number(event.target.value)
              : event.target.value || null,
        })
      }
      className="h-9 w-full min-w-24 rounded-lg border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      aria-label={`Varyant ${index + 1} ${field}`}
      placeholder={field}
    />
  );
  return (
    <tr className="transition-colors hover:bg-zinc-50">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span
            className="size-5 rounded-full border border-zinc-300"
            style={{ backgroundColor: color?.hex_code }}
          />
          <span className="font-bold">
            {color?.display_name || color?.name || "Standart"}
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-semibold">
        {variant.storage_value} {variant.storage_unit}
      </td>
      <td className="px-2 py-2">{input("sku")}</td>
      <td className="px-2 py-2">{input("barcode")}</td>
      <td className="px-2 py-2">{input("price", "number")}</td>
      <td className="px-2 py-2">{input("old_price", "number")}</td>
      <td className="px-2 py-2">{input("stock_quantity", "number")}</td>
      <td className="px-3 py-2 text-center">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={variant.is_active}
            onChange={(event) =>
              onChange({ ...variant, is_active: event.target.checked })
            }
            className="size-4 accent-red-600"
            aria-label={`Varyant ${index + 1} aktif`}
          />
        </label>
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={onDefault}
          disabled={!variant.is_active}
          className="inline-grid size-8 place-items-center rounded-full hover:bg-emerald-50 disabled:opacity-40"
          aria-label={`Varyant ${index + 1} varsayılan`}
        >
          {variant.is_default ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <span className="size-4 rounded-full border border-zinc-300" />
          )}
        </button>
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={onDelete}
          className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Varyantı sil"
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}

function ColorImageManager({
  productId,
  color,
  images,
  onImages,
}: {
  productId: string;
  color: VariantColorDraft;
  images: Tables<"product_images">[];
  onImages: (images: Tables<"product_images">[]) => void;
}) {
  const [pending, setPending] = useState<PendingProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const upload = async () => {
    if (!pending.length) return;
    setUploading(true);
    const result = await uploadProductImages(
      productId,
      pending,
      images.length,
      undefined,
      color.id,
    );
    setUploading(false);
    if (result.data) {
      onImages([...images, ...result.data]);
      setPending([]);
    }
  };
  return (
    <details className="rounded-xl border border-zinc-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-bold">
        <span
          className="size-6 rounded-full border border-zinc-300"
          style={{ backgroundColor: color.hex_code }}
        />
        <span className="flex-1">{color.display_name || color.name}</span>
        <ImageIcon className="size-4 text-zinc-400" />
        {images.length} görsel
      </summary>
      <div className="border-t border-zinc-100 p-4">
        <AdminProductImages
          productId={productId}
          colorId={color.id}
          images={images}
          onImagesChange={onImages}
          pendingImages={pending}
          onPendingImagesChange={setPending}
        />
        {pending.length ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void upload()}
            disabled={uploading}
            className="mt-3"
          >
            {uploading ? "Yükleniyor…" : "Renk görsellerini yükle"}
          </Button>
        ) : null}
      </div>
    </details>
  );
}
