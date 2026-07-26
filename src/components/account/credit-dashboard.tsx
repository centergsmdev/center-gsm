"use client";
import { useEffect, useState } from "react";
import { CreditCard, History } from "lucide-react";
import { getMyCredits } from "@/lib/credits";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export function CreditDashboard() {
  const [account, setAccount] =
      useState<Tables<"store_credit_accounts"> | null>(null),
    [store, setStore] = useState<Tables<"store_credit_transactions">[]>([]),
    [gift, setGift] = useState<Tables<"gift_card_transactions">[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    void getMyCredits().then((r) => {
      if (r.data) {
        setAccount(r.data.account);
        setStore(r.data.storeTransactions);
        setGift(r.data.giftTransactions);
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
      <Card className="bg-zinc-950 p-6 text-white">
        <CreditCard className="size-6 text-red-400" />
        <p className="mt-5 text-sm text-zinc-400">
          Kullanılabilir mağaza bakiyesi
        </p>
        <p className="mt-1 text-3xl font-black">
          {formatCurrency(account?.balance ?? 0)}
        </p>
      </Card>
      <HistoryList
        title="Store Credit Geçmişi"
        rows={store.map((x) => ({
          id: x.id,
          label: x.description ?? x.type,
          amount: x.amount,
          date: x.created_at,
        }))}
      />
      <HistoryList
        title="Gift Card Geçmişi"
        rows={gift.map((x) => ({
          id: x.id,
          label: x.description ?? x.type,
          amount: x.amount,
          date: x.created_at,
        }))}
      />
    </div>
  );
}
function HistoryList({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; label: string; amount: number; date: string }[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b p-5">
        <History className="size-4" />
        <h2 className="font-black">{title}</h2>
      </div>
      {rows.length ? (
        <ul className="divide-y">
          {rows.map((x) => (
            <li key={x.id} className="flex justify-between gap-3 p-5">
              <div>
                <p className="font-bold">{x.label}</p>
                <p className="text-xs text-muted">
                  {new Date(x.date).toLocaleString("tr-TR")}
                </p>
              </div>
              <strong
                className={x.amount > 0 ? "text-emerald-700" : "text-red-700"}
              >
                {x.amount > 0 ? "+" : ""}
                {formatCurrency(x.amount)}
              </strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-8 text-center text-sm text-muted">Henüz işlem yok.</p>
      )}
    </Card>
  );
}
