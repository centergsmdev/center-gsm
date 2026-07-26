"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountEmptyState } from "@/components/account/account-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/lib/supabase/auth-api";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/types/database";
export function AccountOrders() {
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      const client = createClient();
      if (!client) {
        setError("Supabase bağlantısı yapılandırılmamış.");
        setLoading(false);
        return;
      }
      const user = await authApi(client).getUser();
      if (!user.data.user) {
        setLoading(false);
        return;
      }
      const result = await client
        .from("orders")
        .select("*")
        .eq("user_id", user.data.user.id)
        .order("created_at", { ascending: false });
      if (result.error) setError("Siparişler yüklenemedi.");
      else setOrders(result.data);
      setLoading(false);
    })();
  }, []);
  if (loading) return <Skeleton className="h-52 rounded-xl" />;
  if (error)
    return (
      <p
        className="rounded-xl bg-red-50 p-5 text-sm font-semibold text-red-700"
        role="alert"
      >
        {error}
      </p>
    );
  if (!orders.length)
    return (
      <AccountEmptyState
        title="Henüz siparişiniz yok"
        description="Tamamladığınız siparişler burada görüntülenecek."
      />
    );
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border bg-surface-subtle p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted">
                Sipariş numarası
              </p>
              <p className="mt-1 font-black">{order.order_number}</p>
            </div>
            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">
              {order.status}
            </span>
          </div>
          <div className="flex items-center gap-4 p-5">
            <span className="grid size-12 place-items-center rounded-lg bg-red-50 text-primary">
              <Package className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays className="size-3.5" />
                {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(
                  new Date(order.created_at),
                )}
              </p>
              <p className="mt-2 font-black">
                {formatCurrency(order.grand_total)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {order.selected_shipping_name ?? "Kargo firması bekleniyor"}
                {order.estimated_delivery_days
                  ? ` · ${order.estimated_delivery_days} iş günü`
                  : ""}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/hesabim/iadeler/yeni?orderId=${order.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                İade / Değişim
              </Link>
              <Link
                href={`/siparis/${order.order_number}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Detay
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
