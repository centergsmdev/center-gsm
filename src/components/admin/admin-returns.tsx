"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAdminReturns,
  RETURN_REASONS,
  RETURN_STATUSES,
} from "@/lib/returns";
import type { ReturnStatus, Tables } from "@/types/database";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { adminControlClass } from "@/components/admin/admin-form";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
export function AdminReturns() {
  const [items, setItems] = useState<Tables<"return_requests">[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    void getAdminReturns().then((r) => {
      setItems(r.data ?? []);
      setError(r.error ?? "");
      setLoading(false);
    });
  }, []);
  const rows = useMemo(
    () =>
      items.filter(
        (x) =>
          (!status || x.status === status) &&
          `${x.rma_number} ${x.description}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, query, status],
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <AdminCard>
      <AdminCardHeader
        title="İade ve değişim talepleri"
        description={`${rows.length} kayıt`}
      />
      <div className="grid gap-3 border-b p-4 sm:grid-cols-2">
        <input
          className={adminControlClass}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="RMA numarası veya açıklama…"
        />
        <select
          className={adminControlClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(RETURN_STATUSES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState />
      ) : !rows.length ? (
        <AdminEmptyState title="Talep bulunamadı" />
      ) : (
        <AdminTable label="İade talepleri">
          <thead>
            <tr>
              <AdminTh>RMA</AdminTh>
              <AdminTh>Tarih</AdminTh>
              <AdminTh>Sebep</AdminTh>
              <AdminTh>Durum</AdminTh>
              <AdminTh>İşlem</AdminTh>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((x) => (
              <tr key={x.id}>
                <AdminTd className="font-bold">{x.rma_number}</AdminTd>
                <AdminTd>
                  {new Date(x.created_at).toLocaleDateString("tr-TR")}
                </AdminTd>
                <AdminTd>{RETURN_REASONS[x.reason]}</AdminTd>
                <AdminTd>{RETURN_STATUSES[x.status as ReturnStatus]}</AdminTd>
                <AdminTd>
                  <Link
                    className="font-bold text-red-600"
                    href={`/admin/iadeler/${x.id}`}
                  >
                    Detay
                  </Link>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      {!loading && !error && rows.length ? (
        <div className="flex items-center justify-between border-t p-4 text-sm">
          <span>
            Sayfa {page} / {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Önceki
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
              disabled={page === pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </button>
          </div>
        </div>
      ) : null}
    </AdminCard>
  );
}
