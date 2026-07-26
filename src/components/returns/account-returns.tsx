"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyReturns, RETURN_REASONS, RETURN_STATUSES } from "@/lib/returns";
import type { Tables } from "@/types/database";
export function AccountReturns() {
  const [items, setItems] = useState<Tables<"return_requests">[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    void getMyReturns().then((r) => {
      setItems(r.data ?? []);
      setError(r.error ?? "");
      setLoading(false);
    });
  }, []);
  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (error)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
        {error}
      </p>
    );
  if (!items.length)
    return (
      <Card className="p-8 text-center">
        <h2 className="font-black">İade talebiniz yok</h2>
        <p className="mt-2 text-sm text-muted">
          Siparişlerinizden uygun ürünler için talep oluşturabilirsiniz.
        </p>
      </Card>
    );
  return (
    <div className="space-y-3">
      {items.map((x) => (
        <Link href={`/hesabim/iadeler/${x.id}`} key={x.id}>
          <Card className="mb-3 flex items-center justify-between p-5">
            <div>
              <p className="font-black">{x.rma_number}</p>
              <p className="mt-1 text-sm text-muted">
                {RETURN_REASONS[x.reason]} ·{" "}
                {new Date(x.created_at).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">
              {RETURN_STATUSES[x.status]}
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
