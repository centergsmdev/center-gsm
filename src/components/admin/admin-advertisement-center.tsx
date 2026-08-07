"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Eye,
  ExternalLink,
  Save,
  Sparkles,
  Target,
} from "lucide-react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import { AdminModal } from "@/components/admin/admin-modal-lazy";
import {
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import {
  getAdvertisementCenterData,
  saveAdvertisementCenterSettings,
  saveAdvertisementProduct,
} from "@/lib/admin/advertisement-center";
import {
  AD_PRIORITIES,
  AD_TYPES,
  type AdvertisementProduct,
} from "@/types/advertisement-center";
import type { AdvertisementCenterSettings } from "@/types/database";

export function AdminAdvertisementCenter() {
  const [products, setProducts] = useState<AdvertisementProduct[]>([]);
  const [settings, setSettings] = useState<AdvertisementCenterSettings | null>(
    null,
  );
  const [selected, setSelected] = useState<AdvertisementProduct | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdvertisementCenterData();
    if (result.data) {
      setProducts(result.data.products);
      setSettings(result.data.settings);
      setError("");
    } else setError(result.error ?? "Reklam Merkezi yüklenemedi.");
    setLoading(false);
  }, []);

  useEffect(() => void load(), [load]);

  const stats = useMemo(() => {
    const eligible = products.filter(
      (product) => product.score >= 60 && product.stock > 0,
    ).length;
    const included = products.filter((product) => product.isIncluded).length;
    const categories = new Map<string, number>();
    products.forEach((product) =>
      categories.set(
        product.categoryName,
        (categories.get(product.categoryName) ?? 0) + 1,
      ),
    );
    return {
      eligible,
      included,
      excluded: products.length - included,
      categories: [...categories.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [products]);

  const visible = products.filter((product) =>
    `${product.name} ${product.sku} ${product.categoryName}`
      .toLocaleLowerCase("tr-TR")
      .includes(query.toLocaleLowerCase("tr-TR")),
  );

  const updateProduct = async (
    product: AdvertisementProduct,
    patch: Partial<AdvertisementProduct>,
  ) => {
    const next = { ...product, ...patch };
    setProducts((items) =>
      items.map((item) => (item.id === product.id ? next : item)),
    );
    setSaving(true);
    const result = await saveAdvertisementProduct({
      product_id: next.id,
      is_included: next.isIncluded,
      priority: next.priority,
      ad_types: next.adTypes,
    });
    setSaving(false);
    if (!result.data) {
      setError(result.error ?? "Ürün reklam ayarı kaydedilemedi.");
      await load();
    } else setNotice(`${next.name} reklam ayarı kaydedildi.`);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const result = await saveAdvertisementCenterSettings({
      daily_budget: Number(settings.daily_budget),
      target_country: settings.target_country.trim(),
      excluded_regions: settings.excluded_regions,
    });
    setSaving(false);
    if (!result.data) setError(result.error ?? "Genel ayarlar kaydedilemedi.");
    else {
      setSettings(result.data);
      setNotice(
        "Reklam Merkezi ayarları kaydedildi. Meta'ya veri gönderilmedi.",
      );
    }
  };

  if (loading) return <AdminLoadingState />;
  if (error && !products.length)
    return <AdminErrorState retry={() => void load()} />;
  return (
    <div className="space-y-6">
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Reklama uygun"
          value={stats.eligible}
          detail="Puan ≥ 60 ve stokta"
        />
        <Stat
          label="Reklama alınan"
          value={stats.included}
          detail="Admin tarafından seçildi"
        />
        <Stat
          label="Reklam dışı"
          value={stats.excluded}
          detail="Henüz seçilmedi"
        />
        <Stat
          label="Aktif katalog"
          value={products.length}
          detail={`${products.reduce((sum, item) => sum + item.variantCount, 0)} varyant`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <AdminCard>
          <AdminCardHeader
            title="Reklam planı"
            description="Bu ayarlar yalnız Reklam Merkezi'nde saklanır; Meta'ya gönderilmez."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <label className="space-y-2 text-sm font-semibold">
              Günlük bütçe (TL)
              <Input
                type="number"
                min="0"
                step="10"
                value={settings?.daily_budget ?? 0}
                onChange={(event) =>
                  settings &&
                  setSettings({
                    ...settings,
                    daily_budget: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Hedef ülke
              <Input
                value={settings?.target_country ?? ""}
                onChange={(event) =>
                  settings &&
                  setSettings({
                    ...settings,
                    target_country: event.target.value,
                  })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-semibold sm:col-span-2">
              Hariç tutulan bölgeler
              <Input
                value={settings?.excluded_regions.join(", ") ?? ""}
                onChange={(event) =>
                  settings &&
                  setSettings({
                    ...settings,
                    excluded_regions: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <Button
              className="sm:col-span-2 sm:justify-self-end"
              disabled={saving}
              onClick={() => void saveSettings()}
            >
              <Save className="size-4" />
              Ayarları kaydet
            </Button>
          </div>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader
            title="Kategori dağılımı"
            description="Aktif katalogdaki ürün dağılımı"
          />
          <div className="space-y-3 p-5 sm:p-6">
            {stats.categories.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </span>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{
                      width: `${Math.max(8, (count / Math.max(products.length, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-7 text-right text-sm font-bold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Ürün reklam ayarları"
          description={`${visible.length} aktif ürün · puan katalog verisinden anlık hesaplanır`}
          action={
            <Input
              className="sm:w-72"
              placeholder="Ürün, SKU veya kategori ara"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
        />
        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-zinc-200 p-4"
            >
              <div className="flex gap-4">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      className="object-contain p-2"
                      sizes="96px"
                    />
                  ) : (
                    <Sparkles className="absolute inset-0 m-auto size-7 text-zinc-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                    {product.categoryName}
                  </p>
                  <h3 className="mt-1 line-clamp-2 font-bold">
                    {product.name}
                  </h3>
                  <p className="mt-2 font-black">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                <div
                  className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-zinc-100 text-lg font-black"
                  title={product.issues.join(", ")}
                >
                  {product.score}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={product.isIncluded}
                    onChange={(event) =>
                      void updateProduct(product, {
                        isIncluded: event.target.checked,
                      })
                    }
                  />{" "}
                  Reklama dahil et
                </label>
                <select
                  className={adminControlClass}
                  value={product.priority}
                  onChange={(event) =>
                    void updateProduct(product, {
                      priority: event.target
                        .value as AdvertisementProduct["priority"],
                    })
                  }
                >
                  {AD_PRIORITIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {AD_TYPES.map(([value, label]) => (
                  <button
                    key={value}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${product.adTypes.includes(value) ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200"}`}
                    onClick={() =>
                      void updateProduct(product, {
                        adTypes: product.adTypes.includes(value)
                          ? product.adTypes.filter((item) => item !== value)
                          : [...product.adTypes, value],
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <AdminBadge
                  variant={
                    product.score >= 80
                      ? "success"
                      : product.score >= 60
                        ? "warning"
                        : "neutral"
                  }
                >
                  {product.score >= 80
                    ? "Çok iyi"
                    : product.score >= 60
                      ? "Uygun"
                      : "İyileştirilmeli"}
                </AdminBadge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(product)}
                >
                  <Eye className="size-4" />
                  Önizleme
                </Button>
              </div>
            </article>
          ))}
        </div>
      </AdminCard>

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Reklam önizlemesi"
        description="Marketing Studio verisi değiştirilmeden gösterilir."
        wide
      >
        {selected ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-slate-950 to-red-950">
              {selected.imageUrl ? (
                <Image
                  src={selected.imageUrl}
                  alt={selected.name}
                  fill
                  className="object-contain p-10"
                  sizes="500px"
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-6 pt-20 text-white">
                <p className="text-2xl font-black">{selected.name}</p>
                <p className="mt-2 text-xl font-bold text-red-400">
                  {formatCurrency(selected.price)}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black">
                AI Reklam Puanı: {selected.score}/100
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                {selected.issues.length ? (
                  selected.issues.map((issue) => <li key={issue}>• {issue}</li>)
                ) : (
                  <li>Eksik alan bulunmadı.</li>
                )}
              </ul>
              <Link
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white"
                href={`/admin/marketing-studio/instagram?productId=${selected.id}`}
              >
                <ExternalLink className="size-4" />
                Marketing Studio&apos;da aç
              </Link>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{detail}</p>
        </div>
        {label.includes("uygun") ? (
          <Target className="size-7 text-red-500" />
        ) : (
          <BarChart3 className="size-7 text-zinc-300" />
        )}
      </div>
    </AdminCard>
  );
}
