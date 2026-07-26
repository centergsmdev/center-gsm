"use client";
import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { Button } from "@/components/ui/button";
import {
  CRM_PAGE_SIZE,
  CUSTOMER_SEGMENTS,
  CUSTOMER_STATUSES,
  SEGMENT_LABELS,
  formatCrmCurrency,
  formatCrmDate,
  getCustomerTags,
  getCustomers,
} from "@/lib/crm";
import type {
  CustomerFilters,
  CustomerListItem,
  CrmPage,
  CustomerTag,
} from "@/lib/crm";
const initial: CustomerFilters = {
  query: "",
  segment: "",
  status: "",
  tagId: "",
  minOrders: "",
  minLifetimeValue: "",
  page: 1,
  pageSize: CRM_PAGE_SIZE,
};
export function AdminCustomers() {
  const [filters, setFilters] = useState(initial);
  const [data, setData] = useState<CrmPage<CustomerListItem> | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCustomers(filters);
    setData(result.data);
    setError(result.error ?? "");
    setLoading(false);
  }, [filters]);
  useEffect(() => {
    void load();
    void getCustomerTags().then((result) => setTags(result.data ?? []));
  }, [load]);
  const update = (key: keyof CustomerFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / filters.pageSize));
  return (
    <AdminCard>
      <AdminCardHeader
        title="Müşteri listesi"
        description="Müşteri değeri, segmenti ve ilişki geçmişi."
        action={
          <AdminBadge variant="info">{data?.total ?? 0} müşteri</AdminBadge>
        }
      />
      <div className="grid gap-3 border-b border-zinc-100 p-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3 md:col-span-2">
          <Search className="size-4 text-zinc-400" />
          <span className="sr-only">Müşteri ara</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            placeholder="Ad, e-posta veya telefon…"
            className="w-full outline-none"
          />
        </label>
        <Filter
          label="Segment"
          value={filters.segment}
          onChange={(value) => update("segment", value)}
          options={CUSTOMER_SEGMENTS.map((value) => [
            value,
            SEGMENT_LABELS[value],
          ])}
        />
        <Filter
          label="Durum"
          value={filters.status}
          onChange={(value) => update("status", value)}
          options={CUSTOMER_STATUSES.map((value) => [value, value])}
        />
        <Filter
          label="Etiket"
          value={filters.tagId}
          onChange={(value) => update("tagId", value)}
          options={tags.map((tag) => [tag.id, tag.name])}
        />
        <label className="text-xs font-bold">
          Minimum sipariş
          <input
            type="number"
            min="0"
            value={filters.minOrders}
            onChange={(e) => update("minOrders", e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border px-2 font-normal"
          />
        </label>
        <label className="text-xs font-bold">
          Minimum LTV
          <input
            type="number"
            min="0"
            value={filters.minLifetimeValue}
            onChange={(e) => update("minLifetimeValue", e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border px-2 font-normal"
          />
        </label>
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : data?.items.length ? (
        <>
          <AdminTable label="CRM müşteri listesi">
            <thead>
              <tr>
                <AdminTh>Müşteri</AdminTh>
                <AdminTh>Telefon</AdminTh>
                <AdminTh>Segment</AdminTh>
                <AdminTh>Sipariş</AdminTh>
                <AdminTh>Yaşam boyu değer</AdminTh>
                <AdminTh>Son sipariş</AdminTh>
                <AdminTh>Son giriş</AdminTh>
                <AdminTh>Durum</AdminTh>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <AdminTd>
                    <Link
                      prefetch={false}
                      href={`/admin/musteriler/${item.id}`}
                      className="font-bold text-zinc-950 hover:text-red-600"
                    >
                      {item.full_name || "İsimsiz müşteri"}
                    </Link>
                    <p className="text-xs text-zinc-500">{item.email}</p>
                    <div className="mt-1 flex gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </AdminTd>
                  <AdminTd>{item.phone ?? "—"}</AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={
                        item.segment === "vip"
                          ? "warning"
                          : item.segment === "blocked"
                            ? "danger"
                            : "info"
                      }
                    >
                      {SEGMENT_LABELS[item.segment]}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>{item.order_count}</AdminTd>
                  <AdminTd className="font-bold">
                    {formatCrmCurrency(item.lifetime_value)}
                  </AdminTd>
                  <AdminTd className="text-xs">
                    {formatCrmDate(item.last_order_at)}
                  </AdminTd>
                  <AdminTd className="text-xs">
                    {formatCrmDate(item.last_login_at)}
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={
                        item.status === "active"
                          ? "success"
                          : item.status === "blocked"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {item.status}
                    </AdminBadge>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-zinc-500">
              Sayfa {filters.page}/{pages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
              >
                Önceki
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={filters.page >= pages}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
              >
                Sonraki
              </Button>
            </div>
          </div>
        </>
      ) : (
        <AdminEmptyState title="Müşteri bulunamadı" />
      )}
    </AdminCard>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (readonly [string, string])[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-xl border bg-white px-3"
    >
      <option value="">Tüm {label.toLocaleLowerCase("tr-TR")}</option>
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
}
