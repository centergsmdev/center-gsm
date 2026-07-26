"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "./admin-card";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
import { formatCurrency } from "@/lib/format";
import {
  getDashboardMetrics,
  type DashboardMetrics,
} from "@/lib/admin/dashboard";

function MetricGrid({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string | number]>;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 font-bold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {items.map(([label, value]) => (
          <AdminCard key={label} className="p-5">
            <p className="text-xs font-semibold text-zinc-500">{label}</p>
            <p className="mt-3 text-2xl font-black">{value}</p>
          </AdminCard>
        ))}
      </div>
    </section>
  );
}

export function AdminDashboardMetrics() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getDashboardMetrics();
    setData(result.data);
    setError(result.error ?? "");
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);

  if (loading) return <AdminLoadingState />;
  if (error || !data) return <AdminErrorState retry={() => void load()} />;

  return (
    <div className="space-y-6">
      <MetricGrid
        title="Mağaza özeti"
        items={[
          ["Toplam ürün", data.core.products],
          ["Toplam müşteri", data.core.customers],
          ["Toplam sipariş", data.core.orders],
          ["Net gelir", formatCurrency(data.core.netRevenue)],
        ]}
      />
      <MetricGrid
        title="Stok özeti"
        items={[
          ["Toplam stok adedi", data.inventory.total],
          ["Rezerve stok", data.inventory.reserved],
          ["Tükenen ürün", data.inventory.outOfStock],
          ["Kritik stok", data.inventory.critical],
        ]}
      />
      <MetricGrid
        title="Müşteri özeti"
        items={[
          ["Toplam müşteri", data.crm.total],
          ["Aktif müşteri", data.crm.active],
          ["VIP müşteri", data.crm.vip],
          ["Yeni müşteri (30 gün)", data.crm.newCustomers],
          ["Engellenen müşteri", data.crm.blocked],
        ]}
      />
      <MetricGrid
        title="Kargo özeti"
        items={[
          ["Gönderime hazır", data.shipping.ready],
          ["Kargoya verilen", data.shipping.shipped],
          ["Dağıtımdaki", data.shipping.transit],
          ["Bugün teslim", data.shipping.deliveredToday],
          ["Teslim edilemeyen", data.shipping.failed],
        ]}
      />
      <MetricGrid
        title="İşletme analitiği"
        items={[
          ["Bugünkü net gelir", formatCurrency(data.analytics.todayRevenue)],
          ["7 günlük net gelir", formatCurrency(data.analytics.weekRevenue)],
          ["Bugünkü sipariş", data.analytics.todayOrders],
          ["Ortalama sepet", formatCurrency(data.analytics.averageOrder)],
          ["Yeni müşteri", data.analytics.newCustomersToday],
        ]}
      />
    </div>
  );
}
