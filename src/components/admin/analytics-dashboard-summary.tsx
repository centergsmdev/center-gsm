"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminCard } from "./admin-card";
import {
  formatAnalyticsCurrency,
  getAnalyticsOverview,
  presetRange,
} from "@/lib/analytics";
export function AnalyticsDashboardSummary() {
  const [data, setData] = useState<{
    today: number;
    week: number;
    orders: number;
    average: number;
    customers: number;
  } | null>(null);
  useEffect(() => {
    void Promise.all([
      getAnalyticsOverview(presetRange("today")),
      getAnalyticsOverview(presetRange("7d")),
    ]).then(([today, week]) => {
      if (today.data && week.data)
        setData({
          today: today.data.summary.netRevenue,
          week: week.data.summary.netRevenue,
          orders: today.data.summary.orderCount,
          average: week.data.summary.averageOrderValue,
          customers: today.data.summary.newCustomers,
        });
    });
  }, []);
  if (!data) return null;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">İşletme analitiği</h2>
        <Link
          prefetch={false}
          href="/admin/analitik"
          className="text-sm font-bold text-red-600"
        >
          Detayları aç
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Bugünkü net gelir", formatAnalyticsCurrency(data.today)],
          ["7 günlük net gelir", formatAnalyticsCurrency(data.week)],
          ["Bugünkü sipariş", data.orders],
          ["Ortalama sepet", formatAnalyticsCurrency(data.average)],
          ["Yeni müşteri", data.customers],
        ].map(([label, value]) => (
          <AdminCard key={String(label)} className="p-4">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-2 text-xl font-black">{value}</p>
          </AdminCard>
        ))}
      </div>
    </section>
  );
}
