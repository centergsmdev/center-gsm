"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AnalyticsDateFilter } from "./analytics-date-filter";
import { Button } from "@/components/ui/button";
import {
  formatAnalyticsCurrency,
  formatAnalyticsPercent,
  getAnalyticsOverview,
  presetRange,
  refreshAnalytics,
} from "@/lib/analytics";
import type { AnalyticsSummary, DailyMetric } from "@/lib/analytics";
const Chart = dynamic(
  () => import("./analytics-chart").then((module) => module.AnalyticsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
    ),
  },
);
export function AdminAnalyticsOverview() {
  const [range, setRange] = useState(presetRange("30d"));
  const [rows, setRows] = useState<DailyMetric[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAnalyticsOverview(range);
    setRows(result.data?.rows ?? []);
    setSummary(result.data?.summary ?? null);
    setError(result.error ?? "");
    setLoading(false);
  }, [range]);
  useEffect(() => {
    void load();
  }, [load]);
  const refresh = async () => {
    setRefreshing(true);
    const result = await refreshAnalytics(range);
    setRefreshing(false);
    if (result.error) setError(result.error);
    else await load();
  };
  return (
    <div className="space-y-5">
      <AdminCard>
        <AdminCardHeader
          title="Analitik kontrol merkezi"
          description="Supabase aggregation tablolarından hesaplanan işletme metrikleri."
          action={
            <div className="flex gap-2">
              <a
                href={`/api/admin/analytics/export?report=sales&start=${range.start}&end=${range.end}`}
              >
                <Button variant="outline" size="sm">
                  <Download className="size-4" />
                  CSV
                </Button>
              </a>
              <Button
                size="sm"
                onClick={() => void refresh()}
                disabled={refreshing}
              >
                <RefreshCw className="size-4" />
                {refreshing ? "Güncelleniyor" : "Verileri yenile"}
              </Button>
            </div>
          }
        />
        <div className="p-4">
          <AnalyticsDateFilter range={range} onChange={setRange} />
        </div>
      </AdminCard>
      {loading ? (
        <AdminLoadingState />
      ) : error && !summary ? (
        <AdminErrorState retry={() => void load()} />
      ) : !summary || !rows.length ? (
        <AdminEmptyState
          title="Bu rapor için veri bulunamadı"
          description="Aggregation tablolarını yenileyin veya tarih aralığını değiştirin."
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Brüt gelir", formatAnalyticsCurrency(summary.grossRevenue)],
              ["Net gelir", formatAnalyticsCurrency(summary.netRevenue)],
              ["Sipariş", summary.orderCount],
              ["Tamamlanan", summary.completedOrders],
              ["İptal", summary.cancelledOrders],
              [
                "Ortalama sepet",
                formatAnalyticsCurrency(summary.averageOrderValue),
              ],
              ["Satılan ürün", summary.itemsSold],
              ["Yeni müşteri", summary.newCustomers],
              ["Tekrar müşteri", summary.repeatCustomers],
              [
                "Ödeme başarı",
                formatAnalyticsPercent(summary.paymentSuccessRate),
              ],
              ["İptal oranı", formatAnalyticsPercent(summary.cancellationRate)],
              [
                "Teslimat başarı",
                formatAnalyticsPercent(summary.deliverySuccessRate),
              ],
            ].map(([label, value]) => (
              <AdminCard key={String(label)} className="p-5">
                <p className="text-xs font-bold text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </AdminCard>
            ))}
          </section>
          <p className="text-xs text-zinc-500">
            Dönüşüm oranı trafik verisi olmadığı için hesaplanmamaktadır;
            conversion placeholder gerçek oran olarak gösterilmez.
          </p>
          <div className="grid gap-4 xl:grid-cols-2">
            <Chart
              rows={rows}
              metric="gross_revenue"
              title="Günlük brüt gelir"
              description="İptal edilmemiş siparişlerin indirimsiz toplamı."
            />
            <Chart
              rows={rows}
              metric="net_revenue"
              title="Günlük net gelir"
              description="Teslim edilmiş ve tahsil edilmiş siparişler eksi iadeler."
            />
            <Chart
              rows={rows}
              metric="order_count"
              title="Sipariş sayısı"
              description="Günlük oluşturulan siparişler."
            />
            <Chart
              rows={rows}
              metric="average_order_value"
              title="Ortalama sepet"
              description="Günlük ortalama sipariş değeri."
            />
            <Chart
              rows={rows}
              metric="new_customer_count"
              title="Yeni müşteriler"
              description="Günlük yeni müşteri sayısı."
            />
          </div>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Ürün analitiği", "/admin/analitik/urunler"],
          ["Müşteri analitiği", "/admin/analitik/musteriler"],
          ["Sipariş analitiği", "/admin/analitik/siparisler"],
          ["Stok analitiği", "/admin/analitik/stok"],
        ].map(([label, href]) => (
          <Link
            prefetch={false}
            key={href}
            href={href}
            className="rounded-xl border bg-white p-4 font-bold hover:border-zinc-400"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
