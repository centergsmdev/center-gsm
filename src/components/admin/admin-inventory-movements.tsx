"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { adminControlClass } from "./admin-form";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import {
  getAdminInventoryMovements,
  getAdminWarehouses,
} from "@/lib/admin/inventory";
import type {
  AdminInventoryMovement,
  MovementFilters,
} from "@/types/inventory";
import type { Tables } from "@/types/database";
const labels: Record<string, string> = {
  initial_stock: "Başlangıç stoğu",
  manual_increase: "Stok ekleme",
  manual_decrease: "Stok azaltma",
  order_reservation: "Sipariş rezervasyonu",
  order_sale: "Sipariş satışı",
  reservation_release: "Rezervasyon bırakma",
  order_cancel_return: "İptal iadesi",
  customer_return: "Müşteri iadesi",
  stock_correction: "Stok düzeltme",
};
export function AdminInventoryMovements() {
  const [filters, setFilters] = useState<MovementFilters>({}),
    [items, setItems] = useState<AdminInventoryMovement[]>([]),
    [warehouses, setWarehouses] = useState<Tables<"warehouses">[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const [r, w] = await Promise.all([
      getAdminInventoryMovements(filters),
      getAdminWarehouses(),
    ]);
    if (r.data) {
      setItems(r.data);
      setError("");
    } else setError(r.error);
    if (w.data) setWarehouses(w.data);
    setLoading(false);
  }, [filters]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);
  return (
    <div className="space-y-4">
      <Link
        href="/admin/stok"
        className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600"
      >
        <ArrowLeft className="size-4" />
        Stok yönetimine dön
      </Link>
      <AdminCard>
        <AdminCardHeader
          title="Stok hareketleri"
          description={`${items.length} kayıt · Değiştirilemez denetim izi`}
        />
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-5">
          <select
            value={filters.warehouseId ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                warehouseId: e.target.value || undefined,
              })
            }
            className={adminControlClass}
          >
            <option value="">Tüm depolar</option>
            {warehouses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            value={filters.movementType ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                movementType:
                  (e.target.value as MovementFilters["movementType"]) ||
                  undefined,
              })
            }
            className={adminControlClass}
          >
            <option value="">Tüm hareketler</option>
            {Object.entries(labels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={filters.orderNumber ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                orderNumber: e.target.value || undefined,
              })
            }
            placeholder="Sipariş numarası"
            className={adminControlClass}
          />
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                dateFrom: e.target.value
                  ? new Date(`${e.target.value}T00:00:00`).toISOString()
                  : undefined,
              })
            }
            className={adminControlClass}
          />
          <input
            type="date"
            value={filters.dateTo?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                dateTo: e.target.value
                  ? new Date(`${e.target.value}T23:59:59`).toISOString()
                  : undefined,
              })
            }
            className={adminControlClass}
          />
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : error ? (
          <AdminErrorState retry={() => void load()} />
        ) : items.length ? (
          <AdminTable label="Stok hareketleri">
            <thead>
              <tr>
                <AdminTh>Tarih</AdminTh>
                <AdminTh>Ürün</AdminTh>
                <AdminTh>SKU</AdminTh>
                <AdminTh>Depo</AdminTh>
                <AdminTh>Hareket</AdminTh>
                <AdminTh>Miktar</AdminTh>
                <AdminTh>Önce</AdminTh>
                <AdminTh>Sonra</AdminTh>
                <AdminTh>Sipariş</AdminTh>
                <AdminTh>Açıklama</AdminTh>
                <AdminTh>Admin</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <AdminTd className="whitespace-nowrap text-xs">
                    {new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(x.created_at))}
                  </AdminTd>
                  <AdminTd className="font-bold">{x.product_name}</AdminTd>
                  <AdminTd className="font-mono text-xs">{x.sku}</AdminTd>
                  <AdminTd>{x.warehouse_name}</AdminTd>
                  <AdminTd>
                    {labels[x.movement_type] ?? x.movement_type}
                  </AdminTd>
                  <AdminTd
                    className={
                      x.quantity > 0
                        ? "font-bold text-emerald-700"
                        : "font-bold text-red-700"
                    }
                  >
                    {x.quantity > 0 ? "+" : ""}
                    {x.quantity}
                  </AdminTd>
                  <AdminTd>{x.quantity_before}</AdminTd>
                  <AdminTd>{x.quantity_after}</AdminTd>
                  <AdminTd>{x.order_number ?? "—"}</AdminTd>
                  <AdminTd>{x.note}</AdminTd>
                  <AdminTd>{x.admin_name ?? "Sistem"}</AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="Stok hareketi bulunamadı"
            description="Seçili filtrelerle eşleşen kayıt yok."
          />
        )}
      </AdminCard>
    </div>
  );
}
