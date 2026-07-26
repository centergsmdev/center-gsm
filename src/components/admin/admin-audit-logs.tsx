"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
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
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AUDIT_PAGE_SIZE,
  formatAuditDate,
  getAuditActionLabel,
  getAuditLogs,
  summarizeUserAgent,
} from "@/lib/audit";
import type { AuditFilters, AuditPage } from "@/lib/audit";

const initialFilters: AuditFilters = {
  query: "",
  actor: "",
  action: "",
  entityType: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  pageSize: AUDIT_PAGE_SIZE,
};

export function AdminAuditLogs() {
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await getAuditLogs(filters);
    setResult(response.data);
    setError(response.error ?? "");
    setLoading(false);
  }, [filters]);
  useEffect(() => {
    void load();
  }, [load]);
  const update = (key: keyof AuditFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / filters.pageSize));

  return (
    <AdminCard>
      <AdminCardHeader
        title="Denetim kayıtları"
        description="Kritik yönetim işlemlerinin değiştirilemeyen kayıt geçmişi."
      />
      <div className="grid gap-3 border-b border-zinc-100 p-4 lg:grid-cols-4 xl:grid-cols-6">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3 lg:col-span-2">
          <Search className="size-4 text-zinc-400" />
          <span className="sr-only">Kayıtlarda ara</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
            placeholder="Admin, varlık veya ID ara…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="text-xs font-bold text-zinc-600">
          Admin
          <input
            type="email"
            value={filters.actor}
            onChange={(event) => update("actor", event.target.value)}
            placeholder="admin@centergsm.com"
            className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-2 font-normal"
          />
        </label>
        <Select
          label="İşlem filtresi"
          value={filters.action}
          onChange={(value) => update("action", value)}
        >
          <option value="">Tüm işlemler</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {getAuditActionLabel(action)}
            </option>
          ))}
        </Select>
        <Select
          label="Varlık filtresi"
          value={filters.entityType}
          onChange={(value) => update("entityType", value)}
        >
          <option value="">Tüm varlıklar</option>
          {AUDIT_ENTITY_TYPES.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </Select>
        <label className="text-xs font-bold text-zinc-600">
          Başlangıç
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => update("dateFrom", event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-2 font-normal"
          />
        </label>
        <label className="text-xs font-bold text-zinc-600">
          Bitiş
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => update("dateTo", event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-2 font-normal"
          />
        </label>
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : result?.items.length ? (
        <>
          <AdminTable label="Denetim kayıtları">
            <thead>
              <tr>
                <AdminTh>Tarih</AdminTh>
                <AdminTh>Admin</AdminTh>
                <AdminTh>İşlem</AdminTh>
                <AdminTh>Varlık</AdminTh>
                <AdminTh>Değişiklik</AdminTh>
                <AdminTh>IP</AdminTh>
                <AdminTh>Tarayıcı</AdminTh>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <AdminTd className="whitespace-nowrap text-xs">
                    {formatAuditDate(item.created_at)}
                  </AdminTd>
                  <AdminTd>
                    <p className="font-semibold text-zinc-950">
                      {item.actor_email ?? "Sistem"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {item.actor_role ?? "system"}
                    </p>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge variant="info">
                      {getAuditActionLabel(item.action)}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <Link
                      prefetch={false}
                      href={`/admin/denetim-kayitlari/${item.id}`}
                      className="font-semibold text-zinc-950 hover:text-red-600"
                    >
                      {item.entity_name ?? item.entity_id ?? item.entity_type}
                    </Link>
                    <p className="text-xs text-zinc-500">{item.entity_type}</p>
                  </AdminTd>
                  <AdminTd className="text-xs">
                    {item.old_data ? "Önceki → Yeni" : "Yeni kayıt"}
                  </AdminTd>
                  <AdminTd className="font-mono text-xs">
                    {item.ip_address ?? "—"}
                  </AdminTd>
                  <AdminTd className="text-xs">
                    {summarizeUserAgent(item.user_agent)}
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <div className="flex items-center justify-between border-t border-zinc-100 p-4">
            <p className="text-sm text-zinc-500">
              Toplam {result.total} kayıt · Sayfa {filters.page}/{pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
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
                variant="outline"
                size="sm"
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
        <AdminEmptyState
          title="Denetim kaydı bulunamadı"
          description="Seçili filtrelerle eşleşen kayıt bulunmuyor."
        />
      )}
    </AdminCard>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-xs font-bold text-zinc-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 font-normal text-zinc-800"
      >
        {children}
      </select>
    </label>
  );
}
