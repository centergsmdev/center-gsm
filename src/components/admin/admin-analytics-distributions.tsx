"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AnalyticsDateFilter } from "./analytics-date-filter";
import { getOrderAnalytics, presetRange } from "@/lib/analytics";
import type { DistributionItem, OrderAnalytics } from "@/lib/analytics";
export function AdminAnalyticsDistributions() {
  const [range, setRange] = useState(presetRange("30d"));
  const [data, setData] = useState<OrderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getOrderAnalytics(range);
    setData(result.data);
    setError(result.error ?? "");
    setLoading(false);
  }, [range]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-4">
      <AdminCard>
        <AdminCardHeader
          title="Sipariş analitiği"
          description="Sipariş, ödeme, teslimat yöntemi ve kargo dağılımları."
          action={
            <a
              href={`/api/admin/analytics/export?report=orders&start=${range.start}&end=${range.end}`}
              className="text-sm font-bold text-red-600"
            >
              CSV indir
            </a>
          }
        />
        <div className="p-4">
          <AnalyticsDateFilter range={range} onChange={setRange} />
        </div>
      </AdminCard>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState />
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Distribution title="Sipariş durumları" items={data.orderStatuses} />
          <Distribution title="Ödeme durumları" items={data.paymentStatuses} />
          <Distribution
            title="Teslimat durumları"
            items={data.fulfillmentStatuses}
          />
          <Distribution title="Ödeme yöntemleri" items={data.paymentMethods} />
          <Distribution title="Kargo firmaları" items={data.carriers} />
          <Distribution
            title="İptal nedenleri"
            items={[]}
            empty="Siparişlerde yapılandırılmış iptal nedeni verisi bulunmuyor."
          />
        </div>
      ) : (
        <AdminEmptyState title="Bu rapor için veri bulunamadı" />
      )}
    </div>
  );
}
function Distribution({
  title,
  items,
  empty = "Veri bulunamadı",
}: {
  title: string;
  items: DistributionItem[];
  empty?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <AdminCard>
      <AdminCardHeader title={title} />
      <div className="space-y-3 p-5">
        {items.length ? (
          items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="mt-1 h-2 rounded bg-zinc-100">
                <div
                  className="h-full rounded bg-red-600"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">{empty}</p>
        )}
      </div>
    </AdminCard>
  );
}
