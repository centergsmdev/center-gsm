"use client";
import { useEffect, useState } from "react";
import { AdminCard } from "./admin-card";
import { getCrmDashboard } from "@/lib/crm";
export function CrmDashboardMetrics() {
  const [data, setData] = useState<{
    total: number;
    active: number;
    vip: number;
    newCustomers: number;
    blocked: number;
  } | null>(null);
  useEffect(() => {
    void getCrmDashboard().then((result) => setData(result.data));
  }, []);
  if (!data) return null;
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      aria-label="CRM metrikleri"
    >
      {[
        ["Toplam müşteri", data.total],
        ["Aktif müşteri", data.active],
        ["VIP müşteri", data.vip],
        ["Yeni müşteriler (30 gün)", data.newCustomers],
        ["Engellenen müşteri", data.blocked],
      ].map(([label, value]) => (
        <AdminCard key={String(label)} className="p-5">
          <p className="text-xs font-semibold text-zinc-500">{label}</p>
          <p className="mt-3 text-2xl font-black">{value}</p>
        </AdminCard>
      ))}
    </section>
  );
}
