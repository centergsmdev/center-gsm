"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { TRADE_IN_STATUS_LABELS } from "@/lib/trade-in/constants";
import type { TradeInApplicationRow, TradeInStatus } from "@/types/database";

const badgeVariant = (status: TradeInStatus) => {
  if (status === "completed" || status === "accepted")
    return "success" as const;
  if (status === "rejected" || status === "cancelled") return "danger" as const;
  if (status === "reviewing" || status === "offer_sent")
    return "warning" as const;
  return "info" as const;
};

export function AdminTradeInApplications() {
  const [items, setItems] = useState<TradeInApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/admin/trade-in-applications", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        data?: TradeInApplicationRow[] | null;
      };
      if (!response.ok || !result.data) throw new Error("load_failed");
      setItems(result.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return items.filter(
      (item) =>
        (!status || item.status === status) &&
        (!normalized ||
          `${item.application_number} ${item.customer_name} ${item.phone_e164} ${item.device_brand} ${item.device_model}`
            .toLocaleLowerCase("tr-TR")
            .includes(normalized)),
    );
  }, [items, query, status]);
  const pageSize = 15;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminCard>
      <AdminCardHeader
        title="Telefon takas başvuruları"
        description={`${filtered.length} başvuru`}
      />
      <div className="grid gap-3 border-b border-zinc-100 p-4 sm:grid-cols-[1fr_240px]">
        <input
          type="search"
          className={adminControlClass}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Başvuru no, müşteri veya telefon ara…"
        />
        <select
          className={adminControlClass}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(TRADE_IN_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : failed ? (
        <AdminErrorState retry={() => void load()} />
      ) : !rows.length ? (
        <AdminEmptyState
          title="Takas başvurusu bulunamadı"
          description="Müşteriler telefon takas formunu gönderdiğinde kayıtlar burada görünecek."
        />
      ) : (
        <AdminTable label="Telefon takas başvuruları">
          <thead>
            <tr>
              <AdminTh>Başvuru</AdminTh>
              <AdminTh>Müşteri</AdminTh>
              <AdminTh>Telefon</AdminTh>
              <AdminTh>Durum</AdminTh>
              <AdminTh>Tarih</AdminTh>
              <AdminTh>İşlem</AdminTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <AdminTd>
                  <strong className="block text-zinc-950">
                    {item.application_number}
                  </strong>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {item.device_brand} {item.device_model}
                  </span>
                </AdminTd>
                <AdminTd>
                  <strong className="text-zinc-950">
                    {item.customer_name}
                  </strong>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {item.phone_e164}
                  </span>
                </AdminTd>
                <AdminTd>{item.powers_on ? "Açılıyor" : "Açılmıyor"}</AdminTd>
                <AdminTd>
                  <AdminBadge variant={badgeVariant(item.status)}>
                    {TRADE_IN_STATUS_LABELS[item.status]}
                  </AdminBadge>
                </AdminTd>
                <AdminTd>
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.created_at))}
                </AdminTd>
                <AdminTd>
                  <Link
                    href={`/admin/telefon-takas/${item.id}`}
                    className="font-bold text-red-600 hover:underline"
                  >
                    İncele
                  </Link>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      {!loading && !failed && filtered.length > pageSize ? (
        <div className="flex items-center justify-between border-t border-zinc-100 p-4 text-sm text-zinc-600">
          <span>
            {page} / {pages}. sayfa
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Önceki
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Sonraki
            </button>
          </div>
        </div>
      ) : null}
    </AdminCard>
  );
}
