"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminModal } from "./admin-modal-lazy";
import { adminControlClass } from "./admin-form";
import {
  getAdminShippingCarriers,
  updateShippingExperience,
} from "@/shipping/repository/shipping-repository";
import type { Tables } from "@/types/database";
const supported = ["yurtici", "mng", "aras", "surat", "ptt", "hepsijet"];
export function AdminShippingExperienceSettings() {
  const [items, setItems] = useState<Tables<"shipping_carriers">[]>([]),
    [edit, setEdit] = useState<Tables<"shipping_carriers"> | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminShippingCarriers();
    if (result.data) {
      setItems(
        result.data.filter((item) => supported.includes(item.provider_key)),
      );
      setError("");
    } else setError(result.error ?? "");
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    const form = new FormData(event.currentTarget);
    const result = await updateShippingExperience(edit.id, {
      isActive: form.get("active") === "on",
      isDefault: form.get("default") === "on",
      estimatedDays: Number(form.get("days")),
      freeLabel: String(form.get("freeLabel")),
      description: String(form.get("description")),
      logoUrl: String(form.get("logo")),
    });
    if (!result.data) setError(result.error ?? "");
    else {
      setNotice("Kargo firması ayarları güncellendi.");
      setEdit(null);
      await load();
    }
  }
  return (
    <AdminCard>
      <AdminCardHeader
        title="Müşteri kargo seçenekleri"
        description="Checkout'ta gösterilecek firmaları, varsayılan seçimi ve teslimat bilgisini yönetin."
      />
      {notice ? (
        <p
          role="status"
          className="m-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Kargo firması bulunamadı"
          description="Migration sonrasında desteklenen firmalar burada görünür."
        />
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-black">{item.name}</h3>
                  <p className="text-xs text-zinc-500">
                    {item.estimated_delivery_days} iş günü ·{" "}
                    {item.free_shipping_label}
                  </p>
                </div>
                <span className="text-xs font-bold">
                  {item.is_default
                    ? "Varsayılan"
                    : item.is_active
                      ? "Aktif"
                      : "Pasif"}
                </span>
              </div>
              <p className="mt-3 text-sm text-zinc-600">
                {item.customer_description ?? "Açıklama yok"}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => setEdit(item)}
              >
                Düzenle
              </Button>
            </article>
          ))}
        </div>
      )}
      <AdminModal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title="Kargo firması ayarları"
      >
        {edit ? (
          <form onSubmit={save} className="space-y-3">
            <label className="block text-sm font-bold">
              Tahmini teslimat (iş günü)
              <input
                name="days"
                type="number"
                min="1"
                max="30"
                required
                defaultValue={edit.estimated_delivery_days}
                className={`${adminControlClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-bold">
              Ücretsiz kargo açıklaması
              <input
                name="freeLabel"
                required
                maxLength={120}
                defaultValue={edit.free_shipping_label}
                className={`${adminControlClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-bold">
              Müşteri açıklaması
              <textarea
                name="description"
                maxLength={240}
                defaultValue={edit.customer_description ?? ""}
                className={`${adminControlClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-bold">
              Logo URL
              <input
                name="logo"
                type="url"
                defaultValue={edit.logo_url ?? ""}
                className={`${adminControlClass} mt-1`}
              />
            </label>
            <label className="flex gap-2 text-sm font-bold">
              <input
                name="active"
                type="checkbox"
                defaultChecked={edit.is_active}
              />
              Aktif
            </label>
            <label className="flex gap-2 text-sm font-bold">
              <input
                name="default"
                type="checkbox"
                defaultChecked={edit.is_default}
              />
              Varsayılan firma
            </label>
            <Button type="submit" className="w-full">
              Kaydet
            </Button>
          </form>
        ) : null}
      </AdminModal>
    </AdminCard>
  );
}
