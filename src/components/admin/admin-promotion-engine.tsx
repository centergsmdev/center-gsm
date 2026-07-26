"use client";
import { useEffect, useState } from "react";
import { AdminCoupons } from "./admin-promotions";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/types/database";
type Stat = {
  coupon: Tables<"coupons">;
  uses: number;
  discount: number;
  orders: number;
  users: number;
  lastUsed: string | null;
  conversion: number;
};
export function AdminPromotionEngine() {
  const [stats, setStats] = useState<Stat[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      const db = createClient();
      if (!db) {
        setError("Supabase bağlantısı yapılandırılmamış.");
        setLoading(false);
        return;
      }
      const [coupons, redemptions, logs] = await Promise.all([
        db
          .from("coupons")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        db
          .from("coupon_redemptions")
          .select("*")
          .eq("status", "redeemed")
          .limit(1000),
        db.from("promotion_usage_logs").select("*").limit(2000),
      ]);
      if (coupons.error || redemptions.error || logs.error)
        setError("Promosyon istatistikleri yüklenemedi.");
      else
        setStats(
          coupons.data.map((coupon) => {
            const uses = redemptions.data.filter(
                (item) => item.coupon_id === coupon.id,
              ),
              validations = logs.data.filter(
                (item) =>
                  item.coupon_id === coupon.id &&
                  item.event_type === "validated",
              ).length;
            return {
              coupon,
              uses: uses.length,
              discount: uses.reduce(
                (sum, item) => sum + item.discount_amount,
                0,
              ),
              orders: new Set(uses.map((item) => item.order_id).filter(Boolean))
                .size,
              users: new Set(uses.map((item) => item.user_id).filter(Boolean))
                .size,
              lastUsed:
                uses
                  .map((item) => item.redeemed_at)
                  .filter((value): value is string => Boolean(value))
                  .sort()
                  .at(-1) ?? null,
              conversion: validations
                ? Math.round((uses.length / validations) * 1000) / 10
                : 0,
            };
          }),
        );
      setLoading(false);
    })();
  }, []);
  return (
    <div className="space-y-5">
      <AdminCard>
        <AdminCardHeader
          title="Promosyon performansı"
          description="Kupon dönüşümü ve sağlanan toplam indirim"
        />
        {loading ? (
          <AdminLoadingState />
        ) : error ? (
          <AdminErrorState />
        ) : stats.length === 0 ? (
          <AdminEmptyState
            title="İstatistik bulunamadı"
            description="Kupon kullanımları burada özetlenecek."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {[
                    "Kupon",
                    "Kullanım",
                    "Toplam indirim",
                    "Sipariş",
                    "Aktif kullanıcı",
                    "Son kullanım",
                    "Dönüşüm",
                  ].map((item) => (
                    <th key={item} className="p-4">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.map((item) => (
                  <tr key={item.coupon.id}>
                    <td className="p-4">
                      <strong>{item.coupon.code}</strong>
                      <span className="block text-xs text-zinc-500">
                        {item.coupon.title}
                      </span>
                    </td>
                    <td className="p-4">{item.uses}</td>
                    <td className="p-4">{formatCurrency(item.discount)}</td>
                    <td className="p-4">{item.orders}</td>
                    <td className="p-4">{item.users}</td>
                    <td className="p-4">
                      {item.lastUsed
                        ? new Date(item.lastUsed).toLocaleString("tr-TR")
                        : "—"}
                    </td>
                    <td className="p-4 font-bold">%{item.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
      <AdminCoupons />
    </div>
  );
}
