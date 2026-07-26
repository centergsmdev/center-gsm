import Link from "next/link";
import { ArrowRight, PackageCheck, TrendingUp } from "lucide-react";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { InventoryDashboardMetrics } from "@/components/admin/inventory-dashboard-metrics";
import { ShippingDashboardMetrics } from "@/components/admin/shipping-dashboard-metrics";
import { CrmDashboardMetrics } from "@/components/admin/crm-dashboard-metrics";
import { AnalyticsDashboardSummary } from "@/components/admin/analytics-dashboard-summary";
import { dashboardMetrics } from "@/data/admin/mock-data";
const tones = {
  dark: "bg-zinc-950",
  success: "bg-emerald-500",
  info: "bg-blue-500",
  warning: "bg-amber-500",
  purple: "bg-violet-500",
  danger: "bg-red-600",
} as const;
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <InventoryDashboardMetrics />
      <ShippingDashboardMetrics />
      <CrmDashboardMetrics />
      <AnalyticsDashboardSummary />
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        aria-label="Mağaza metrikleri"
      >
        {dashboardMetrics.map((x) => (
          <AdminCard key={x.label} className="relative overflow-hidden p-5">
            <span
              className={`absolute left-0 top-5 h-8 w-1 rounded-r-full ${tones[x.tone]}`}
            />
            <p className="text-xs font-semibold text-zinc-500">{x.label}</p>
            <p className="mt-3 text-2xl font-black">{x.value}</p>
            <p className="mt-2 text-xs text-zinc-500">{x.change}</p>
          </AdminCard>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <AdminCardHeader
            title="Stok operasyonu"
            description="Gerçek envanter ve hareket kayıtları"
            action={
              <AdminBadge variant="success">
                <PackageCheck className="mr-1 size-3" />
                Canlı
              </AdminBadge>
            }
          />
          <div className="space-y-3 p-5">
            <Link
              href="/admin/stok"
              className="flex items-center justify-between rounded-xl border p-4 text-sm font-bold hover:border-zinc-400"
            >
              Stok yönetimine git
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/admin/stok/hareketler"
              className="flex items-center justify-between rounded-xl border p-4 text-sm font-bold hover:border-zinc-400"
            >
              Hareketleri incele
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader
            title="Operasyon merkezi"
            description="Katalog ve sipariş iş akışları"
            action={<TrendingUp className="size-5 text-red-600" />}
          />
          <div className="space-y-3 p-5">
            <Link
              href="/admin/siparisler"
              className="flex items-center justify-between rounded-xl border p-4 text-sm font-bold hover:border-zinc-400"
            >
              Siparişleri yönet
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/admin/depolar"
              className="flex items-center justify-between rounded-xl border p-4 text-sm font-bold hover:border-zinc-400"
            >
              Depoları yönet
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
