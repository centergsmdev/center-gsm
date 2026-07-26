import Link from "next/link";
import { ArrowRight, PackageCheck, TrendingUp } from "lucide-react";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { AdminDashboardMetrics } from "@/components/admin/dashboard-metrics";
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <AdminDashboardMetrics />
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
