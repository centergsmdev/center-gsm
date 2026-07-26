"use client";
import { RefreshCw, Search } from "lucide-react";
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
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PAGE_SIZE,
  formatNotificationDate,
  getNotificationLogs,
  getNotificationQueue,
  processNotificationQueueItem,
} from "@/lib/notifications";
import type {
  NotificationFilters,
  NotificationLog,
  NotificationQueueItem,
  PageResult,
} from "@/lib/notifications";
const initial: NotificationFilters = {
  query: "",
  status: "",
  channel: "",
  page: 1,
  pageSize: NOTIFICATION_PAGE_SIZE,
};
export function AdminNotificationQueue({
  initialView = "queue",
}: {
  initialView?: "queue" | "logs";
}) {
  const [view, setView] = useState(initialView);
  const [filters, setFilters] = useState(initial);
  const [data, setData] = useState<PageResult<
    NotificationQueueItem | NotificationLog
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const result =
      view === "queue"
        ? await getNotificationQueue(filters)
        : await getNotificationLogs(filters);
    setData(result.data);
    setError(result.error ?? "");
    setLoading(false);
  }, [filters, view]);
  useEffect(() => {
    void load();
  }, [load]);
  const update = (key: keyof NotificationFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const process = async (id: string) => {
    setProcessing(id);
    const result = await processNotificationQueueItem(id);
    setProcessing(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await load();
  };
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / filters.pageSize));
  return (
    <AdminCard>
      <AdminCardHeader
        title="Bildirim kuyruğu"
        description="Mock provider gönderimleri, yeniden denemeler ve teslimat geçmişi."
        action={
          <div className="flex rounded-full bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setView("queue")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${view === "queue" ? "bg-white shadow" : ""}`}
            >
              Kuyruk
            </button>
            <button
              type="button"
              onClick={() => setView("logs")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${view === "logs" ? "bg-white shadow" : ""}`}
            >
              Loglar
            </button>
          </div>
        }
      />
      <div className="grid gap-3 border-b border-zinc-100 p-4 md:grid-cols-3">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3">
          <Search className="size-4 text-zinc-400" />
          <span className="sr-only">Alıcı ara</span>
          <input
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
            placeholder="Alıcı ara…"
            className="w-full outline-none"
          />
        </label>
        <FilterSelect
          label="Kanal"
          value={filters.channel}
          onChange={(value) => update("channel", value)}
          options={NOTIFICATION_CHANNELS.map((channel) => [
            channel,
            CHANNEL_LABELS[channel],
          ])}
        />
        <FilterSelect
          label="Durum"
          value={filters.status}
          onChange={(value) => update("status", value)}
          options={(view === "queue"
            ? ["pending", "processing", "sent", "failed", "cancelled"]
            : ["pending", "sent", "failed"]
          ).map((status) => [status, status])}
        />
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error && !data ? (
        <AdminErrorState retry={() => void load()} />
      ) : data?.items.length ? (
        <>
          {view === "queue" ? (
            <QueueTable
              items={data.items as NotificationQueueItem[]}
              processing={processing}
              process={process}
            />
          ) : (
            <LogTable items={data.items as NotificationLog[]} />
          )}
          <div className="flex items-center justify-between border-t border-zinc-100 p-4">
            <p className="text-sm text-zinc-500">
              Toplam {data.total} kayıt · {filters.page}/{pages}
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
        <AdminEmptyState
          title={view === "queue" ? "Kuyruk boş" : "Gönderim kaydı bulunamadı"}
        />
      )}
    </AdminCard>
  );
}
function QueueTable({
  items,
  processing,
  process,
}: {
  items: NotificationQueueItem[];
  processing: string | null;
  process: (id: string) => Promise<void>;
}) {
  return (
    <AdminTable label="Bildirim kuyruğu">
      <thead>
        <tr>
          <AdminTh>Event</AdminTh>
          <AdminTh>Kanal</AdminTh>
          <AdminTh>Alıcı</AdminTh>
          <AdminTh>Durum</AdminTh>
          <AdminTh>Retry</AdminTh>
          <AdminTh>Hata</AdminTh>
          <AdminTh>Oluşturulma</AdminTh>
          <AdminTh>İşlenme</AdminTh>
          <AdminTh>İşlem</AdminTh>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <AdminTd className="font-mono text-xs">
              {item.event_id.slice(0, 8)}
            </AdminTd>
            <AdminTd>{CHANNEL_LABELS[item.channel]}</AdminTd>
            <AdminTd>{item.recipient}</AdminTd>
            <AdminTd>
              <Status value={item.status} />
            </AdminTd>
            <AdminTd>{item.retry_count}</AdminTd>
            <AdminTd className="max-w-48 truncate text-xs">
              {item.last_error ?? "—"}
            </AdminTd>
            <AdminTd className="text-xs">
              {formatNotificationDate(item.created_at)}
            </AdminTd>
            <AdminTd className="text-xs">
              {formatNotificationDate(item.processed_at)}
            </AdminTd>
            <AdminTd>
              {item.status === "pending" || item.status === "failed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processing === item.id}
                  onClick={() => void process(item.id)}
                >
                  <RefreshCw className="size-3" />
                  {processing === item.id ? "İşleniyor" : "Mock gönder"}
                </Button>
              ) : (
                "—"
              )}
            </AdminTd>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}
function LogTable({ items }: { items: NotificationLog[] }) {
  return (
    <AdminTable label="Bildirim gönderim logları">
      <thead>
        <tr>
          <AdminTh>Kuyruk</AdminTh>
          <AdminTh>Kanal</AdminTh>
          <AdminTh>Alıcı</AdminTh>
          <AdminTh>Durum</AdminTh>
          <AdminTh>Provider</AdminTh>
          <AdminTh>Tarih</AdminTh>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <AdminTd className="font-mono text-xs">
              {item.queue_id.slice(0, 8)}
            </AdminTd>
            <AdminTd>{CHANNEL_LABELS[item.channel]}</AdminTd>
            <AdminTd>{item.recipient}</AdminTd>
            <AdminTd>
              <Status value={item.status} />
            </AdminTd>
            <AdminTd>{item.provider}</AdminTd>
            <AdminTd>{formatNotificationDate(item.created_at)}</AdminTd>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}
function Status({ value }: { value: string }) {
  return (
    <AdminBadge
      variant={
        value === "sent"
          ? "success"
          : value === "failed"
            ? "danger"
            : value === "pending"
              ? "warning"
              : "neutral"
      }
    >
      {value}
    </AdminBadge>
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | readonly string[])[][];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
    >
      <option value="">Tüm {label.toLocaleLowerCase("tr-TR")}</option>
      {options.map(([key, text]) => (
        <option key={String(key)} value={String(key)}>
          {String(text)}
        </option>
      ))}
    </select>
  );
}
