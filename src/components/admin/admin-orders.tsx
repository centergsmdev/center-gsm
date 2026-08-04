"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search, Trash2 } from "lucide-react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { deleteAdminOrder, getAdminOrders } from "@/lib/admin/orders";
import { formatCurrency } from "@/lib/format";
import type { AdminOrder } from "@/types/order-management";

const statusLabel: Record<string, string> = {
  received: "Sipariş alındı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoya verildi",
  delivered: "Teslim edildi",
  cancelled: "İptal",
};
const paymentLabel: Record<string, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  refunded: "İade",
};
export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminOrders();
    if (!result.data) setError(result.error ?? "Siparişler yüklenemedi.");
    else {
      setOrders(result.data);
      setError("");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      orders.filter((order) =>
        `${order.order_number} ${order.customerName} ${order.email}`
          .toLocaleLowerCase("tr-TR")
          .includes(query.toLocaleLowerCase("tr-TR")),
      ),
    [orders, query],
  );
  const removeOrder = async (order: AdminOrder) => {
    const confirmation = window.prompt(
      `Bu işlem geri alınamaz. Siparişi her yerden silmek için ${order.order_number} yazın.`,
    );
    if (confirmation !== order.order_number) {
      if (confirmation !== null)
        setError("Sipariş numarası eşleşmedi. Silme iptal edildi.");
      return;
    }
    if (
      !window.confirm(
        "Sipariş ve bağlantılı tüm kayıtlar kalıcı olarak silinecek. Devam edilsin mi?",
      )
    )
      return;
    setDeletingId(order.id);
    setError("");
    setNotice("");
    const result = await deleteAdminOrder(order.id, order.order_number);
    setDeletingId(null);
    if (!result.data) {
      setError(result.error ?? "Sipariş silinemedi.");
      return;
    }
    setOrders((current) => current.filter((item) => item.id !== order.id));
    setNotice(result.error ?? `${order.order_number} kalıcı olarak silindi.`);
  };
  return (
    <AdminCard>
      <AdminCardHeader
        title="Sipariş yönetimi"
        description="Gerçek Supabase sipariş kayıtları"
        action={
          <AdminBadge variant="warning">
            {orders.filter((item) => item.status === "received").length}{" "}
            bekleyen
          </AdminBadge>
        }
      />
      {notice ? (
        <p
          className="mx-4 mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error && !loading ? (
        <p
          className="mx-4 mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="border-b border-zinc-100 p-4">
        <label className="flex h-11 max-w-lg items-center gap-2 rounded-xl border border-zinc-200 px-3">
          <Search className="size-4 text-zinc-400" />
          <span className="sr-only">Sipariş ara</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sipariş no, müşteri veya e-posta ara…"
            className="w-full text-sm outline-none"
          />
        </label>
      </div>
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : visible.length ? (
        <AdminTable label="Sipariş listesi">
          <thead>
            <tr>
              <AdminTh>Sipariş no</AdminTh>
              <AdminTh>Tarih</AdminTh>
              <AdminTh>Müşteri</AdminTh>
              <AdminTh>Toplam</AdminTh>
              <AdminTh>Durum</AdminTh>
              <AdminTh>Ödeme</AdminTh>
              <AdminTh>Teslimat</AdminTh>
              <AdminTh className="text-right">İşlemler</AdminTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-50">
                <AdminTd className="font-bold text-zinc-950">
                  {order.order_number}
                </AdminTd>
                <AdminTd>
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(order.created_at))}
                </AdminTd>
                <AdminTd>
                  <p className="font-semibold text-zinc-950">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-zinc-500">{order.email}</p>
                </AdminTd>
                <AdminTd className="font-bold text-zinc-950">
                  {formatCurrency(order.grand_total)}
                </AdminTd>
                <AdminTd>
                  <AdminBadge
                    variant={
                      order.status === "cancelled"
                        ? "danger"
                        : order.status === "delivered"
                          ? "success"
                          : "warning"
                    }
                  >
                    {statusLabel[order.status] ?? order.status}
                  </AdminBadge>
                </AdminTd>
                <AdminTd>
                  <AdminBadge
                    variant={
                      order.payment_status === "paid"
                        ? "success"
                        : order.payment_status === "refunded"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {paymentLabel[order.payment_status] ?? order.payment_status}
                  </AdminBadge>
                </AdminTd>
                <AdminTd>
                  {order.delivery_method === "express"
                    ? "Hızlı"
                    : order.delivery_method === "store"
                      ? "Mağaza"
                      : "Standart"}
                </AdminTd>
                <AdminTd>
                  <div className="ml-auto flex w-fit items-center gap-1">
                    <Link
                      href={`/admin/siparisler/${order.id}`}
                      className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                      aria-label={`${order.order_number} detayını aç`}
                    >
                      <Eye className="size-4" />
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={() => void removeOrder(order)}
                      className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`${order.order_number} siparişini kalıcı olarak sil`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmptyState
          title="Sipariş bulunamadı"
          description="Arama kriterinize uyan sipariş kaydı yok."
        />
      )}
    </AdminCard>
  );
}
