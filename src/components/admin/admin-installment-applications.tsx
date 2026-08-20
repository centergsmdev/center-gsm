"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Search } from "lucide-react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import {
  INSTALLMENT_STATUS_LABELS,
  type InstallmentAdminListItem,
  type InstallmentApplicationStatus,
} from "@/lib/installment/types";

const badge: Record<
  InstallmentApplicationStatus,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  draft: "neutral",
  submitted: "warning",
  under_review: "info",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

const filters = [
  ["pending", "Bekleyen"],
  ["approved", "Onaylanan"],
  ["rejected", "Reddedilen"],
  ["all", "Tümü"],
] as const;

export function AdminInstallmentApplications() {
  const router = useRouter();
  const [items, setItems] = useState<InstallmentAdminListItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number][0]>("pending");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ status });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(
        `/api/admin/installment-applications?${params}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("load_failed");
      const payload = (await response.json()) as {
        items: InstallmentAdminListItem[];
      };
      setItems(payload.items);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <AdminCard>
      <AdminCardHeader
        title="Elden Taksit Başvuruları"
        description="Başvuruları sipariş ve ödeme akışından bağımsız olarak inceleyin."
        action={
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <FileSignature className="size-4" /> {items.length} kayıt
          </div>
        }
      />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={status === value ? "secondary" : "outline"}
                onClick={() => setStatus(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <span className="sr-only">Başvurularda ara</span>
            <Input
              className="pl-9"
              placeholder="Başvuru no, müşteri veya telefon"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : failed ? (
          <AdminErrorState retry={() => void load()} />
        ) : items.length === 0 ? (
          <AdminEmptyState
            title="Başvuru bulunamadı"
            description="Seçili filtre ve arama için kayıt bulunmuyor."
          />
        ) : (
          <AdminTable label="Elden taksit başvuruları">
            <thead>
              <tr>
                <AdminTh>Başvuru No</AdminTh>
                <AdminTh>Tarih</AdminTh>
                <AdminTh>Müşteri</AdminTh>
                <AdminTh>Telefon</AdminTh>
                <AdminTh>Ürün / Varyant</AdminTh>
                <AdminTh>Tutar</AdminTh>
                <AdminTh>Durum</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                  onClick={() =>
                    router.push(`/admin/elden-taksit-basvurulari/${item.id}`)
                  }
                >
                  <AdminTd className="font-mono text-xs font-bold text-zinc-950">
                    {item.applicationNumber}
                  </AdminTd>
                  <AdminTd>
                    {new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.submittedAt ?? item.createdAt))}
                  </AdminTd>
                  <AdminTd className="font-semibold text-zinc-950">
                    {item.applicantName}
                  </AdminTd>
                  <AdminTd>{item.phone}</AdminTd>
                  <AdminTd>
                    <p className="font-semibold text-zinc-950">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.variantTitle ?? "Varyantsız ürün"}
                    </p>
                  </AdminTd>
                  <AdminTd className="font-bold text-zinc-950">
                    {formatCurrency(item.price)}
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge variant={badge[item.status]}>
                      {INSTALLMENT_STATUS_LABELS[item.status]}
                    </AdminBadge>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </div>
    </AdminCard>
  );
}
