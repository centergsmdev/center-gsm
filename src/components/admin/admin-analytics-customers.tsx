"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { AnalyticsDateFilter } from "./analytics-date-filter";
import {
  formatAnalyticsCurrency,
  getCustomerAnalytics,
  presetRange,
} from "@/lib/analytics";
import type { CustomerMetric, CustomerAnalyticsFilters } from "@/lib/analytics";
type Row = CustomerMetric & { name: string; segment: string };
export function AdminAnalyticsCustomers() {
  const [range, setRange] = useState(presetRange("30d"));
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<CustomerAnalyticsFilters>({
    query: "",
    segment: "",
    minRevenue: "",
    minOrders: "",
    repeat: "",
  });
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCustomerAnalytics(range, page, filters);
    setItems(result.data?.items ?? []);
    setTotal(result.data?.total ?? 0);
    setError(result.error ?? "");
    setLoading(false);
  }, [range, page, filters]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <AdminCard>
      <AdminCardHeader
        title="Müşteri analitiği"
        description="Gelir, tekrar satın alma ve müşteri sipariş davranışı."
        action={
          <a
            href={`/api/admin/analytics/export?report=customers&start=${range.start}&end=${range.end}`}
            className="text-sm font-bold text-red-600"
          >
            CSV indir
          </a>
        }
      />
      <div className="p-4">
        <AnalyticsDateFilter range={range} onChange={setRange} />
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <input
            aria-label="Müşteri ara"
            placeholder="Müşteri ara"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="h-10 rounded-xl border px-3"
          />
          <select
            aria-label="Segment"
            value={filters.segment}
            onChange={(e) =>
              setFilters({ ...filters, segment: e.target.value })
            }
            className="h-10 rounded-xl border bg-white px-3"
          >
            <option value="">Tüm segmentler</option>
            {["new", "active", "vip", "inactive", "blocked"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            aria-label="Minimum gelir"
            placeholder="Minimum gelir"
            value={filters.minRevenue}
            onChange={(e) =>
              setFilters({ ...filters, minRevenue: e.target.value })
            }
            className="h-10 rounded-xl border px-3"
          />
          <input
            type="number"
            min="0"
            aria-label="Minimum sipariş"
            placeholder="Minimum sipariş"
            value={filters.minOrders}
            onChange={(e) =>
              setFilters({ ...filters, minOrders: e.target.value })
            }
            className="h-10 rounded-xl border px-3"
          />
          <select
            aria-label="Tekrar müşteri"
            value={filters.repeat}
            onChange={(e) =>
              setFilters({
                ...filters,
                repeat: e.target.value as CustomerAnalyticsFilters["repeat"],
              })
            }
            className="h-10 rounded-xl border bg-white px-3"
          >
            <option value="">Tümü</option>
            <option value="yes">Tekrar müşteri</option>
            <option value="no">İlk alışveriş</option>
          </select>
        </div>
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState />
      ) : items.length ? (
        <>
          <AdminTable label="Müşteri analitiği">
            <thead>
              <tr>
                <AdminTh>Müşteri</AdminTh>
                <AdminTh>Segment</AdminTh>
                <AdminTh>Sipariş</AdminTh>
                <AdminTh>Gelir</AdminTh>
                <AdminTh>Ort. sepet</AdminTh>
                <AdminTh>Ürün</AdminTh>
                <AdminTh>İade</AdminTh>
                <AdminTh>İlk sipariş</AdminTh>
                <AdminTh>Son sipariş</AdminTh>
                <AdminTh>Tekrar</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <AdminTd>
                    {item.customer_id ? (
                      <Link
                        prefetch={false}
                        href={`/admin/musteriler/${item.customer_id}`}
                        className="font-bold hover:text-red-600"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </AdminTd>
                  <AdminTd>{item.segment}</AdminTd>
                  <AdminTd>{item.order_count}</AdminTd>
                  <AdminTd>{formatAnalyticsCurrency(item.revenue)}</AdminTd>
                  <AdminTd>
                    {formatAnalyticsCurrency(
                      item.order_count ? item.revenue / item.order_count : 0,
                    )}
                  </AdminTd>
                  <AdminTd>{item.items_purchased}</AdminTd>
                  <AdminTd>
                    {formatAnalyticsCurrency(item.refund_total)}
                  </AdminTd>
                  <AdminTd>{item.first_order_at?.slice(0, 10) ?? "—"}</AdminTd>
                  <AdminTd>{item.last_order_at?.slice(0, 10) ?? "—"}</AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={item.is_repeat_customer ? "success" : "neutral"}
                    >
                      {item.is_repeat_customer ? "Evet" : "Hayır"}
                    </AdminBadge>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <div className="flex justify-end gap-2 border-t p-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-40"
            >
              Önceki
            </button>
            <button
              type="button"
              disabled={page >= Math.max(1, Math.ceil(total / 25))}
              onClick={() => setPage(page + 1)}
              className="rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        </>
      ) : (
        <AdminEmptyState title="Bu rapor için veri bulunamadı" />
      )}
    </AdminCard>
  );
}
