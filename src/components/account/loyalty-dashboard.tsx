"use client";
import { useEffect, useState } from "react";
import { Coins, Gift, History } from "lucide-react";
import { getMyLoyalty } from "@/lib/loyalty";
import type { Tables } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
const labels: Record<string, string> = {
  earn: "Kazanç",
  redeem: "Kullanım",
  refund: "İade",
  adjustment: "Düzeltme",
  bonus: "Bonus",
  manual_add: "Manuel ekleme",
  manual_remove: "Manuel silme",
};
export function LoyaltyDashboard() {
  const [account, setAccount] = useState<Tables<"loyalty_accounts"> | null>(
      null,
    ),
    [rows, setRows] = useState<Tables<"loyalty_transactions">[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    void getMyLoyalty().then((r) => {
      if (r.data) {
        setAccount(r.data.account);
        setRows(r.data.transactions);
      }
      setError(r.error ?? "");
      setLoading(false);
    });
  }, []);
  if (loading) return <Skeleton className="h-72 rounded-xl" />;
  if (error)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">
        {error}
      </p>
    );
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Coins}
          label="Toplam kazanılan"
          value={account?.lifetime_earned ?? 0}
        />
        <Metric
          icon={Gift}
          label="Kullanılabilir"
          value={account?.available_points ?? 0}
        />
        <Metric
          icon={History}
          label="Bekleyen"
          value={account?.pending_points ?? 0}
        />
      </div>
      <Card className="overflow-hidden">
        <div className="border-b p-5">
          <h2 className="font-black">Puan geçmişi</h2>
        </div>
        {rows.length ? (
          <ul className="divide-y">
            {rows.map((x) => (
              <li
                key={x.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-bold">{labels[x.type] ?? x.type}</p>
                  <p className="mt-1 text-xs text-muted">
                    {x.description ?? "Sadakat puanı hareketi"} ·{" "}
                    {new Date(x.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
                <strong
                  className={x.points > 0 ? "text-emerald-700" : "text-red-700"}
                >
                  {x.points > 0 ? "+" : ""}
                  {x.points.toLocaleString("tr-TR")}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-muted">
            Henüz puan hareketiniz yok.
          </p>
        )}
      </Card>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-5">
      <Icon className="size-5 text-red-600" />
      <p className="mt-4 text-xs font-bold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black">
        {value.toLocaleString("tr-TR")} puan
      </p>
    </Card>
  );
}
