"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit3,
  ImageIcon,
  MoreHorizontal,
  Power,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";

import { AdminBadge } from "./admin-badge";
import { AdminCard } from "./admin-card";
import { AdminModal } from "./admin-modal-lazy";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { Button } from "@/components/ui/button";
import {
  deactivateAdminProduct,
  getAdminProductReferences,
  getAdminProducts,
  permanentlyDeleteAdminProduct,
  setAdminProductActive,
} from "@/lib/admin/products";
import { formatCurrency } from "@/lib/format";
import { plainText } from "@/lib/seo/seo";
import type {
  AdminProduct,
  AdminProductFilters,
  AdminProductReference,
} from "@/types/admin-product";

const initialFilters: AdminProductFilters = {
  query: "",
  brandId: "",
  categoryId: "",
  active: "all",
  stock: "all",
  sort: "newest",
};

export function AdminProducts() {
  const [filters, setFilters] = useState(initialFilters);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [brands, setBrands] = useState<AdminProductReference[]>([]);
  const [categories, setCategories] = useState<AdminProductReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingDeactivate, setPendingDeactivate] =
    useState<AdminProduct | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] =
    useState<AdminProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [list, references] = await Promise.all([
      getAdminProducts(filters),
      getAdminProductReferences(),
    ]);
    if (!list.data || !references.data)
      setError(list.error ?? references.error ?? "Ürünler yüklenemedi.");
    else {
      setProducts(list.data);
      setBrands(references.data.brands);
      setCategories(references.data.categories);
    }
    setLoading(false);
  }, [filters]);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const update = <K extends keyof AdminProductFilters>(
    key: K,
    value: AdminProductFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const deactivate = async () => {
    if (!pendingDeactivate) return;
    setBusy(true);
    const result = await deactivateAdminProduct(pendingDeactivate.id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      setPendingDeactivate(null);
      return;
    }
    setNotice(`${pendingDeactivate.name} pasif duruma alındı.`);
    setPendingDeactivate(null);
    await load();
    window.setTimeout(() => setNotice(""), 3000);
  };
  const activate = async (product: AdminProduct) => {
    setBusy(true);
    const result = await setAdminProductActive(product.id, true);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice(`${product.name} tekrar aktif duruma alındı.`);
    await load();
    window.setTimeout(() => setNotice(""), 3000);
  };
  const permanentlyDelete = async () => {
    if (!pendingPermanentDelete) return;
    setBusy(true);
    const result = await permanentlyDeleteAdminProduct(
      pendingPermanentDelete.id,
    );
    setBusy(false);
    if (result.error) {
      setError(result.error);
      setPendingPermanentDelete(null);
      return;
    }
    setNotice(`${pendingPermanentDelete.name} kalıcı olarak silindi.`);
    setPendingPermanentDelete(null);
    await load();
    window.setTimeout(() => setNotice(""), 3000);
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <AdminBadge variant="success">{products.length} ürün</AdminBadge>
          <AdminBadge>Supabase kataloğu</AdminBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/urunler/hizli-olustur"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300"
          >
            <Sparkles className="size-4 text-red-600" />
            Hızlı ürün oluştur
          </Link>
          <Link
            href="/admin/urunler/yeni"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700"
          >
            <Plus className="size-4" />
            Yeni ürün
          </Link>
        </div>
      </div>
      {notice ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      <AdminCard>
        <div className="grid gap-3 border-b border-zinc-100 p-4 lg:grid-cols-3 2xl:grid-cols-[1fr_180px_180px_160px_180px_180px]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3 lg:col-span-3 2xl:col-span-1">
            <Search className="size-4 text-zinc-400" />
            <span className="sr-only">Ürün ara</span>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
              placeholder="Ürün adı, SKU veya marka ara…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <FilterSelect
            label="Marka filtresi"
            value={filters.brandId}
            onChange={(value) => update("brandId", value)}
          >
            <option value="">Tüm markalar</option>
            {brands.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Kategori filtresi"
            value={filters.categoryId}
            onChange={(value) => update("categoryId", value)}
          >
            <option value="">Tüm kategoriler</option>
            {categories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Durum filtresi"
            value={filters.active}
            onChange={(value) =>
              update("active", value as AdminProductFilters["active"])
            }
          >
            <option value="all">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </FilterSelect>
          <FilterSelect
            label="Stok filtresi"
            value={filters.stock}
            onChange={(value) =>
              update("stock", value as AdminProductFilters["stock"])
            }
          >
            <option value="all">Tüm stoklar</option>
            <option value="in-stock">Stokta</option>
            <option value="out-of-stock">Tükendi</option>
          </FilterSelect>
          <FilterSelect
            label="Sıralama"
            value={filters.sort}
            onChange={(value) =>
              update("sort", value as AdminProductFilters["sort"])
            }
          >
            <option value="newest">Yeni ürünler</option>
            <option value="oldest">Eski ürünler</option>
            <option value="price-asc">Fiyat artan</option>
            <option value="price-desc">Fiyat azalan</option>
            <option value="stock-desc">Stok miktarı</option>
          </FilterSelect>
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : error ? (
          <AdminErrorState retry={() => void load()} />
        ) : products.length ? (
          <AdminTable label="Ürün listesi">
            <thead>
              <tr>
                <AdminTh>Ürün</AdminTh>
                <AdminTh>Marka</AdminTh>
                <AdminTh>Kategori</AdminTh>
                <AdminTh>SKU</AdminTh>
                <AdminTh>Fiyat</AdminTh>
                <AdminTh>Stok</AdminTh>
                <AdminTh>Durum</AdminTh>
                <AdminTh>Oluşturulma</AdminTh>
                <AdminTh className="text-right">İşlem</AdminTh>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-50/80">
                  <AdminTd>
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center"
                        style={
                          product.primaryImage
                            ? {
                                backgroundImage: `url(${JSON.stringify(product.primaryImage.url).slice(1, -1)})`,
                              }
                            : undefined
                        }
                      >
                        {product.primaryImage ? (
                          <span className="sr-only">
                            {product.primaryImage.alt_text ?? product.name}
                          </span>
                        ) : (
                          <ImageIcon className="size-4 text-zinc-400" />
                        )}
                      </span>
                      <div>
                        <p className="max-w-64 truncate font-bold text-zinc-950">
                          {product.name}
                        </p>
                        <p className="mt-0.5 max-w-64 truncate text-xs text-zinc-500">
                          {product.description
                            ? plainText(product.description)
                            : "Açıklama yok"}
                        </p>
                      </div>
                    </div>
                  </AdminTd>
                  <AdminTd>{product.brand.name}</AdminTd>
                  <AdminTd>{product.category.name}</AdminTd>
                  <AdminTd className="font-mono text-xs">{product.sku}</AdminTd>
                  <AdminTd className="font-bold text-zinc-950">
                    {formatCurrency(product.price)}
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={
                        product.stock_quantity > 0 ? "success" : "danger"
                      }
                    >
                      {product.stock_quantity}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={product.is_active ? "success" : "neutral"}
                    >
                      {product.is_active ? "Aktif" : "Pasif"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    {new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "medium",
                    }).format(new Date(product.created_at))}
                  </AdminTd>
                  <AdminTd>
                    <ProductActions
                      product={product}
                      busy={busy}
                      onDeactivate={() => setPendingDeactivate(product)}
                      onActivate={() => void activate(product)}
                      onPermanentDelete={() =>
                        setPendingPermanentDelete(product)
                      }
                    />
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="Eşleşen ürün bulunamadı"
            description="Arama veya filtre kriterlerinizi değiştirerek tekrar deneyin."
          />
        )}
      </AdminCard>
      <AdminModal
        open={Boolean(pendingDeactivate)}
        onClose={() => !busy && setPendingDeactivate(null)}
        title="Ürünü pasife al?"
        description="Ürün müşteri kataloğunda görünmeyecek, kayıt korunacaktır."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPendingDeactivate(null)}
              disabled={busy}
            >
              İptal
            </Button>
            <Button
              variant="danger"
              onClick={() => void deactivate()}
              disabled={busy}
            >
              {busy ? "İşleniyor…" : "Pasife Al"}
            </Button>
          </>
        }
      >
        {pendingDeactivate?.name} satıştan kaldırılacak; geçmiş kayıtları
        korunacak ve daha sonra yeniden aktif yapılabilecek.
      </AdminModal>
      <AdminModal
        open={Boolean(pendingPermanentDelete)}
        onClose={() => !busy && setPendingPermanentDelete(null)}
        title="Ürünü kalıcı olarak sil"
        description="Bu işlem yalnızca sipariş geçmişi olmayan ürünlerde uygulanabilir."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPendingPermanentDelete(null)}
              disabled={busy}
            >
              İptal
            </Button>
            <Button
              variant="danger"
              onClick={() => void permanentlyDelete()}
              disabled={busy}
            >
              {busy ? "Siliniyor…" : "Kalıcı Olarak Sil"}
            </Button>
          </>
        }
      >
        <p className="whitespace-pre-line text-sm font-semibold leading-6 text-zinc-700">
          Bu ürünü kalıcı olarak silmek istediğinize emin misiniz?
          {"\n\n"}Bu işlem geri alınamaz.
        </p>
      </AdminModal>
    </div>
  );
}

function ProductActions({
  product,
  busy,
  onDeactivate,
  onActivate,
  onPermanentDelete,
}: {
  product: AdminProduct;
  busy: boolean;
  onDeactivate: () => void;
  onActivate: () => void;
  onPermanentDelete: () => void;
}) {
  const closeMenu = (event: React.MouseEvent<HTMLButtonElement>) =>
    event.currentTarget.closest("details")?.removeAttribute("open");

  return (
    <details className="group relative ml-auto w-fit">
      <summary
        className="grid size-9 cursor-pointer list-none place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 [&::-webkit-details-marker]:hidden"
        aria-label={`${product.name} işlemlerini aç`}
      >
        <MoreHorizontal className="size-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 text-left shadow-xl">
        <Link
          href={`/admin/urunler/${product.id}`}
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          <Edit3 className="size-4" />
          Düzenle
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={(event) => {
            closeMenu(event);
            if (product.is_active) onDeactivate();
            else onActivate();
          }}
          className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-700 transition hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
        >
          <Power className="size-4" />
          {product.is_active ? "Pasife Al" : "Aktif Yap"}
        </button>
        <div className="my-1 border-t border-zinc-100" />
        <button
          type="button"
          disabled={busy}
          onClick={(event) => {
            closeMenu(event);
            onPermanentDelete();
          }}
          className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
          Kalıcı Olarak Sil
        </button>
      </div>
    </details>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <SlidersHorizontal className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-red-500"
      >
        {children}
      </select>
    </label>
  );
}
