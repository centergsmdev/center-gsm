"use client";

import { RefreshCw, Search, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "./admin-states";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { Button } from "@/components/ui/button";
import { cancelWishlistAlertEvent, getAdminWishlistAlerts, retryWishlistAlertDelivery, WISHLIST_ALERT_PAGE_SIZE, WISHLIST_ALERT_TYPES } from "@/lib/wishlist-alerts";
import type { WishlistAlertMetrics, WishlistAlertStatus, WishlistAlertType } from "@/lib/wishlist-alerts";

const emptyMetrics: WishlistAlertMetrics = { totalPreferences: 0, priceAlerts: 0, stockAlerts: 0, promotionAlerts: 0, events: 0, pending: 0, completed: 0, failed: 0 };
const labels: Record<WishlistAlertType, string> = { price_drop: "Fiyat düştü", back_in_stock: "Stok geldi", promotion_started: "Kampanya başladı" };

export function AdminWishlistAlerts() {
  const [query, setQuery] = useState(""); const [type, setType] = useState<"" | WishlistAlertType>(""); const [status, setStatus] = useState<"" | WishlistAlertStatus>(""); const [page, setPage] = useState(1);
  const [result, setResult] = useState<Awaited<ReturnType<typeof getAdminWishlistAlerts>>["data"]>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); const response = await getAdminWishlistAlerts({ query, type, status, page, pageSize: WISHLIST_ALERT_PAGE_SIZE }); setResult(response.data); setError(response.error ?? ""); setLoading(false); }, [page, query, status, type]);
  useEffect(() => { void load(); }, [load]);
  const act = async (id: string, action: "retry" | "cancel") => { setBusy(id); const response = action === "retry" ? await retryWishlistAlertDelivery(id) : await cancelWishlistAlertEvent(id); setBusy(null); if (response.error) setError(response.error); else await load(); };
  const metrics = result?.metrics ?? emptyMetrics; const pages = Math.max(1, Math.ceil((result?.total ?? 0) / WISHLIST_ALERT_PAGE_SIZE));
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Toplam tercih", metrics.totalPreferences], ["Fiyat alarmı", metrics.priceAlerts], ["Stok alarmı", metrics.stockAlerts], ["Kampanya alarmı", metrics.promotionAlerts], ["Üretilen event", metrics.events], ["Bekleyen", metrics.pending], ["Başarılı", metrics.completed], ["Başarısız", metrics.failed],
    ].map(([label, value]) => <AdminCard key={String(label)} className="p-4"><p className="text-xs font-bold text-zinc-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></AdminCard>)}</div>
    <AdminCard><AdminCardHeader title="Favori alarm olayları" description="Alarm kuyruğunu, teslimat durumunu ve güvenli tekrar denemeleri izleyin." />
      <div className="grid gap-3 border-b border-zinc-100 p-4 md:grid-cols-3"><label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3"><Search className="size-4 text-zinc-400" /><span className="sr-only">Ürün veya müşteri ara</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Ürün veya müşteri ara…" className="w-full outline-none" /></label>
        <select aria-label="Alarm türü" value={type} onChange={(event) => { setType(event.target.value as "" | WishlistAlertType); setPage(1); }} className="h-10 rounded-xl border border-zinc-200 px-3"><option value="">Tüm türler</option>{WISHLIST_ALERT_TYPES.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select>
        <select aria-label="Teslimat durumu" value={status} onChange={(event) => { setStatus(event.target.value as "" | WishlistAlertStatus); setPage(1); }} className="h-10 rounded-xl border border-zinc-200 px-3"><option value="">Tüm durumlar</option>{["pending","processing","completed","failed","cancelled"].map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      {loading ? <AdminLoadingState /> : error && !result ? <AdminErrorState retry={() => void load()} /> : result?.rows.length ? <><AdminTable label="Favori alarm olayları"><thead><tr><AdminTh>Tarih</AdminTh><AdminTh>Müşteri</AdminTh><AdminTh>Ürün</AdminTh><AdminTh>Tür</AdminTh><AdminTh>Durum</AdminTh><AdminTh>İşlem</AdminTh></tr></thead><tbody>{result.rows.map((row) => <tr key={row.id}><AdminTd>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.created_at))}</AdminTd><AdminTd>{row.user_email ?? row.user_id.slice(0, 8)}</AdminTd><AdminTd>{row.product_name}</AdminTd><AdminTd>{labels[row.event_type]}</AdminTd><AdminTd><AdminBadge variant={row.delivery_status === "completed" ? "success" : row.delivery_status === "failed" ? "danger" : "warning"}>{row.delivery_status ?? row.status}</AdminBadge></AdminTd><AdminTd><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row.id, "retry")}><RefreshCw className="size-3" />Tekrar</Button><Button type="button" size="sm" variant="ghost" disabled={busy === row.id} onClick={() => void act(row.id, "cancel")}><XCircle className="size-3" />İptal</Button></div></AdminTd></tr>)}</tbody></AdminTable><div className="flex items-center justify-between border-t border-zinc-100 p-4"><p className="text-sm text-zinc-500">{result.total} kayıt · {page}/{pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Önceki</Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Sonraki</Button></div></div></> : <AdminEmptyState title="Alarm olayı bulunamadı" description="Favori ürünlerde tetiklenen alarmlar burada listelenecek." />}
    </AdminCard>
  </div>;
}
