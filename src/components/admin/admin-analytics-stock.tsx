"use client";
import { useEffect, useState } from "react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { getStockAnalytics } from "@/lib/analytics";
import type { StockAnalytics } from "@/lib/analytics";
export function AdminAnalyticsStock() {
  const [data, setData] = useState<StockAnalytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getStockAnalytics().then((result) => {
      setData(result.data);
      setError(result.error ?? "");
    });
  }, []);
  if (error) return <AdminErrorState />;
  if (!data) return <AdminLoadingState />;
  return (
    <div className="space-y-4">
      <AdminCard>
        <AdminCardHeader
          title="Stok analitiği"
          description="Maliyet veya kâr tahmini içermez; yalnızca gerçek stok hareketleri."
          action={
            <a
              href="/api/admin/analytics/export?report=stock"
              className="text-sm font-bold text-red-600"
            >
              CSV indir
            </a>
          }
        />
      </AdminCard>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Fiziksel stok", data.physical],
          ["Rezerve stok", data.reserved],
          ["Kullanılabilir stok", data.available],
          ["Tükenen ürün", data.outOfStock],
          ["Kritik stok", data.critical],
          ["Son 30 gün hareket", data.movementCount],
        ].map(([label, value]) => (
          <AdminCard key={String(label)} className="p-5">
            <p className="text-xs font-bold text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </AdminCard>
        ))}
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <List title="En fazla stok çıkan ürünler" items={data.topOutgoing} />
        <List title="En fazla manuel düzeltme" items={data.topCorrections} />
      </div>
    </div>
  );
}
function List({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  return (
    <AdminCard>
      <AdminCardHeader title={title} />
      <div className="divide-y">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="flex justify-between p-4 text-sm">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))
        ) : (
          <AdminEmptyState title="Bu rapor için veri bulunamadı" />
        )}
      </div>
    </AdminCard>
  );
}
