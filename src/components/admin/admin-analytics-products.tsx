"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { AnalyticsDateFilter } from "./analytics-date-filter";
import { Button } from "@/components/ui/button";
import {
  ANALYTICS_PAGE_SIZE,
  formatAnalyticsCurrency,
  getProductAnalytics,
  getAnalyticsReferences,
  presetRange,
} from "@/lib/analytics";
import type { ProductMetric, ProductAnalyticsFilters } from "@/lib/analytics";
export function AdminAnalyticsProducts() {
  const [range, setRange] = useState(presetRange("30d"));
  const [items, setItems] = useState<
    (ProductMetric & { availableStock: number })[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ProductAnalyticsFilters>({
    query: "",
    brand: "",
    categoryId: "",
    minSales: "",
    sort: "highest_revenue",
  });
  const [references, setReferences] = useState<{
    brands: { name: string }[];
    categories: { id: string; name: string }[];
  }>({ brands: [], categories: [] });
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getProductAnalytics(range, page, filters);
    const next = result.data?.items ?? [];
    setItems(
      filters.sort === "lowest_stock"
        ? [...next].sort((a, b) => a.availableStock - b.availableStock)
        : next,
    );
    setTotal(result.data?.total ?? 0);
    setError(result.error ?? "");
    setLoading(false);
  }, [page, range, filters]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void getAnalyticsReferences().then(setReferences);
  }, []);
  return (
    <AdminCard>
      <AdminCardHeader
        title="Ürün performansı"
        description="Günlük ürün satış, gelir, indirim, iade ve stok görünümü."
        action={
          <a
            href={`/api/admin/analytics/export?report=products&start=${range.start}&end=${range.end}`}
            className="text-sm font-bold text-red-600"
          >
            CSV indir
          </a>
        }
      />
      <div className="p-4">
        <AnalyticsDateFilter
          range={range}
          onChange={(value) => {
            setRange(value);
            setPage(1);
          }}
        />
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <input
            aria-label="Ürün ara"
            placeholder="Ürün veya SKU ara"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="h-10 rounded-xl border px-3"
          />
          <select
            aria-label="Marka"
            value={filters.brand}
            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
            className="h-10 rounded-xl border bg-white px-3"
          >
            <option value="">Tüm markalar</option>
            {references.brands.map((x) => (
              <option key={x.name}>{x.name}</option>
            ))}
          </select>
          <select
            aria-label="Kategori"
            value={filters.categoryId}
            onChange={(e) =>
              setFilters({ ...filters, categoryId: e.target.value })
            }
            className="h-10 rounded-xl border bg-white px-3"
          >
            <option value="">Tüm kategoriler</option>
            {references.categories.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            aria-label="Minimum satış"
            placeholder="Minimum satış"
            value={filters.minSales}
            onChange={(e) =>
              setFilters({ ...filters, minSales: e.target.value })
            }
            className="h-10 rounded-xl border px-3"
          />
          <select
            aria-label="Sıralama"
            value={filters.sort}
            onChange={(e) =>
              setFilters({
                ...filters,
                sort: e.target.value as ProductAnalyticsFilters["sort"],
              })
            }
            className="h-10 rounded-xl border bg-white px-3"
          >
            <option value="best_selling">En çok satan</option>
            <option value="highest_revenue">En yüksek gelir</option>
            <option value="most_refunded">En çok iade</option>
            <option value="lowest_stock">En düşük stok</option>
            <option value="least_selling">En az satan</option>
          </select>
        </div>
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState />
      ) : items.length ? (
        <>
          <AdminTable label="Ürün analitiği">
            <thead>
              <tr>
                <AdminTh>Ürün</AdminTh>
                <AdminTh>SKU</AdminTh>
                <AdminTh>Marka</AdminTh>
                <AdminTh>Satılan</AdminTh>
                <AdminTh>Sipariş</AdminTh>
                <AdminTh>Brüt gelir</AdminTh>
                <AdminTh>Net gelir</AdminTh>
                <AdminTh>İndirim</AdminTh>
                <AdminTh>İade oranı</AdminTh>
                <AdminTh>Stok</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <AdminTd className="font-bold">{item.product_name}</AdminTd>
                  <AdminTd className="font-mono text-xs">{item.sku}</AdminTd>
                  <AdminTd>{item.brand_name ?? "—"}</AdminTd>
                  <AdminTd>{item.units_sold}</AdminTd>
                  <AdminTd>{item.order_count}</AdminTd>
                  <AdminTd>
                    {formatAnalyticsCurrency(item.gross_revenue)}
                  </AdminTd>
                  <AdminTd>{formatAnalyticsCurrency(item.net_revenue)}</AdminTd>
                  <AdminTd>
                    {formatAnalyticsCurrency(item.discount_total)}
                  </AdminTd>
                  <AdminTd>
                    {item.units_sold
                      ? `${Math.round((item.refund_quantity / item.units_sold) * 100)}%`
                      : "—"}
                  </AdminTd>
                  <AdminTd>{item.availableStock}</AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination
            page={page}
            pages={Math.max(1, Math.ceil(total / ANALYTICS_PAGE_SIZE))}
            setPage={setPage}
          />
        </>
      ) : (
        <AdminEmptyState title="Bu rapor için veri bulunamadı" />
      )}
    </AdminCard>
  );
}
function Pagination({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) {
  return (
    <div className="flex justify-end gap-2 border-t p-4">
      <Button
        size="sm"
        variant="outline"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Önceki
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        Sonraki
      </Button>
    </div>
  );
}
