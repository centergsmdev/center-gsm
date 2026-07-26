"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit3,
  ImageIcon,
  Plus,
  Search,
  SlidersHorizontal,
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
} from "@/lib/admin/products";
import { formatCurrency } from "@/lib/format";
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
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deactivateAdminProduct(pendingDelete.id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      setPendingDelete(null);
      return;
    }
    setNotice(`${pendingDelete.name} pasif duruma alındı.`);
    setPendingDelete(null);
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
        <Link
          href="/admin/urunler/yeni"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700"
        >
          <Plus className="size-4" />
          Yeni ürün
        </Link>
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
                          {product.short_description ?? "Kısa açıklama yok"}
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
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/urunler/${product.id}`}
                        className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                        aria-label={`${product.name} ürününü düzenle`}
                      >
                        <Edit3 className="size-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(product)}
                        className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={`${product.name} ürününü pasif yap`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
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
        open={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        title="Ürünü pasif duruma al?"
        description="Ürün müşteri kataloğunda görünmeyecek, kayıt korunacaktır."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={() => void deactivate()}
              disabled={deleting}
            >
              {deleting ? "İşleniyor…" : "Pasif yap"}
            </Button>
          </>
        }
      >
        {pendingDelete?.name} için soft delete işlemi uygulanacak.
      </AdminModal>
    </div>
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
