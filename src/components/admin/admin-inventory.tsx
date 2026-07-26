"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Edit3,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { adminControlClass } from "./admin-form";
import { AdminModal } from "./admin-modal-lazy";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { Button } from "@/components/ui/button";
import {
  adjustInventory,
  getAdminInventory,
  getAdminWarehouses,
  updateReorderLevel,
} from "@/lib/admin/inventory";
import type { AdminInventoryRow, InventoryFilters } from "@/types/inventory";
import type { Tables } from "@/types/database";
const initial: InventoryFilters = {
  query: "",
  stock: "all",
  productActive: "all",
  sort: "name",
};
export function AdminInventory() {
  const [filters, setFilters] = useState(initial),
    [items, setItems] = useState<AdminInventoryRow[]>([]),
    [warehouses, setWarehouses] = useState<Tables<"warehouses">[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editor, setEditor] = useState<AdminInventoryRow | null>(null),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [r, w] = await Promise.all([
      getAdminInventory(filters),
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
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editor) return;
    const f = new FormData(e.currentTarget),
      mode = String(f.get("mode")) as
        "manual_increase" | "manual_decrease" | "stock_correction",
      quantity = Number(f.get("quantity")),
      reorder = Number(f.get("reorder")),
      note = String(f.get("note")).trim();
    if (!Number.isInteger(quantity) || quantity < 0 || note.length < 3) {
      setError("Miktar ve en az 3 karakterlik açıklama zorunludur.");
      return;
    }
    setSaving(true);
    const a = await adjustInventory(
      editor.warehouse_id,
      editor.product_id,
      mode,
      quantity,
      note,
    );
    if (!a.data) {
      setSaving(false);
      setError(a.error);
      return;
    }
    const r = await updateReorderLevel(
      editor.warehouse_id,
      editor.product_id,
      reorder,
    );
    setSaving(false);
    if (!r.data) {
      setError(r.error);
      return;
    }
    setEditor(null);
    setNotice("Stok hareketi kaydedildi.");
    await load();
  };
  return (
    <div className="space-y-4">
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      <AdminCard>
        <AdminCardHeader
          title="Stok yönetimi"
          description={`${items.length} depo-ürün kaydı`}
          action={
            <Link
              href="/admin/stok/hareketler"
              className="inline-flex items-center gap-2 text-sm font-bold text-red-600"
            >
              Stok hareketleri
              <ArrowRight className="size-4" />
            </Link>
          }
        />
        <div className="grid gap-3 border-b p-4 md:grid-cols-5">
          <label className="flex h-11 items-center gap-2 rounded-lg border px-3 md:col-span-2">
            <Search className="size-4" />
            <input
              value={filters.query}
              onChange={(e) =>
                setFilters({ ...filters, query: e.target.value })
              }
              placeholder="Ürün veya SKU ara…"
              className="w-full text-sm outline-none"
            />
          </label>
          <Select
            value={filters.warehouseId ?? ""}
            change={(v) =>
              setFilters({ ...filters, warehouseId: v || undefined })
            }
          >
            <option value="">Tüm depolar</option>
            {warehouses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.stock ?? "all"}
            change={(v) =>
              setFilters({ ...filters, stock: v as InventoryFilters["stock"] })
            }
          >
            <option value="all">Tüm stoklar</option>
            <option value="in-stock">Stokta</option>
            <option value="critical">Kritik</option>
            <option value="out-of-stock">Tükendi</option>
          </Select>
          <Select
            value={filters.sort ?? "name"}
            change={(v) =>
              setFilters({ ...filters, sort: v as InventoryFilters["sort"] })
            }
          >
            <option value="name">Ürün adı</option>
            <option value="stock-asc">En az stok</option>
            <option value="stock-desc">En fazla stok</option>
            <option value="critical">Kritik seviyeye göre</option>
          </Select>
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : error && !items.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : items.length ? (
          <AdminTable label="Stok listesi">
            <thead>
              <tr>
                <AdminTh>Ürün</AdminTh>
                <AdminTh>SKU</AdminTh>
                <AdminTh>Depo</AdminTh>
                <AdminTh>Mevcut</AdminTh>
                <AdminTh>Rezerve</AdminTh>
                <AdminTh>Kullanılabilir</AdminTh>
                <AdminTh>Kritik seviye</AdminTh>
                <AdminTh>Durum</AdminTh>
              <AdminTh>
                <span className="sr-only">İşlem</span>
              </AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <AdminTd>
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-10 place-items-center rounded-lg bg-zinc-100 bg-cover bg-center"
                        style={
                          x.image_url
                            ? {
                                backgroundImage: `url(${JSON.stringify(x.image_url).slice(1, -1)})`,
                              }
                            : undefined
                        }
                      >
                        {!x.image_url ? <Boxes className="size-4" /> : null}
                      </span>
                      <span className="font-bold text-zinc-950">
                        {x.product.name}
                      </span>
                    </div>
                  </AdminTd>
                  <AdminTd className="font-mono text-xs">
                    {x.product.sku}
                  </AdminTd>
                  <AdminTd>{x.warehouse.name}</AdminTd>
                  <AdminTd>{x.quantity_on_hand}</AdminTd>
                  <AdminTd>{x.quantity_reserved}</AdminTd>
                  <AdminTd className="font-black">{x.available_stock}</AdminTd>
                  <AdminTd>{x.reorder_level}</AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={
                        x.status === "in-stock"
                          ? "success"
                          : x.status === "critical"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {x.status === "in-stock"
                        ? "Stokta"
                        : x.status === "critical"
                          ? "Kritik"
                          : "Tükendi"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <button
                      type="button"
                      onClick={() => setEditor(x)}
                      className="grid size-9 place-items-center rounded-lg hover:bg-zinc-100"
                      aria-label={`${x.product.name} stok işlemi`}
                    >
                      <Edit3 className="size-4" />
                    </button>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="Stok kaydı bulunamadı"
            description="Filtrelerinizi değiştirin."
          />
        )}
      </AdminCard>
      <AdminModal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={editor ? `${editor.product.name} stok işlemi` : "Stok işlemi"}
        description={
          editor
            ? `${editor.warehouse.name} · Kullanılabilir ${editor.available_stock}`
            : undefined
        }
      >
        {editor ? (
          <form onSubmit={save} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">İşlem türü</span>
              <select name="mode" className={adminControlClass}>
                <option value="manual_increase">Stok ekle</option>
                <option value="manual_decrease">Stok azalt</option>
                <option value="stock_correction">Stok düzelt</option>
              </select>
            </label>
            <Field label="Miktar" name="quantity" type="number" value="0" />
            <Field
              label="Kritik stok seviyesi"
              name="reorder"
              type="number"
              value={String(editor.reorder_level)}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                Açıklama / not
              </span>
              <textarea
                name="note"
                rows={3}
                required
                className={`${adminControlClass} h-auto py-3`}
              />
            </label>
            <Button type="submit" className="w-full" disabled={saving}>
              <SlidersHorizontal className="size-4" />
              {saving ? "İşleniyor…" : "Stok işlemini uygula"}
            </Button>
          </form>
        ) : null}
      </AdminModal>
    </div>
  );
}
function Select({
  value,
  change,
  children,
}: {
  value: string;
  change: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      className={adminControlClass}
    >
      {children}
    </select>
  );
}
function Field({
  label,
  name,
  type,
  value,
}: {
  label: string;
  name: string;
  type: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        min="0"
        defaultValue={value}
        required
        className={adminControlClass}
      />
    </label>
  );
}
