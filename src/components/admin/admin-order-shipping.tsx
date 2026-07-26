"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { adminControlClass } from "./admin-form";
import {
  createManualShipment,
  getAdminShippingCarriers,
  getOrderShipments,
} from "@/shipping/repository/shipping-repository";
import { SHIPPING_STATUS_LABELS } from "@/shipping/types";
import type { OrderDetail } from "@/types/order-management";
import type { Tables } from "@/types/database";
export function AdminOrderShipping({ detail }: { detail: OrderDetail }) {
  const [shipments, setShipments] = useState<Tables<"shipments">[]>([]),
    [carriers, setCarriers] = useState<Tables<"shipping_carriers">[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      getOrderShipments(detail.order.id),
      getAdminShippingCarriers(),
    ]);
    if (s.data) setShipments(s.data);
    if (c.data) setCarriers(c.data.filter((x) => x.is_active));
  }, [detail.order.id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      items = detail.items.flatMap((x) => {
        const q = Number(f.get(`item-${x.id}`));
        return q > 0 ? [{ orderItemId: x.id, quantity: q }] : [];
      });
    const r = await createManualShipment({
      orderId: detail.order.id,
      carrierId: String(f.get("carrier")),
      trackingNumber: String(f.get("tracking")),
      estimatedDeliveryAt: String(f.get("estimated")),
      shippingCost: Number(f.get("cost")),
      adminNote: String(f.get("note")),
      package: {
        packageCount: Number(f.get("packages")),
        weight: Number(f.get("weight")),
        desi: Number(f.get("desi")),
        note: String(f.get("note")),
      },
      items,
    });
    if (!r.data) {
      setError(r.error ?? "");
      return;
    }
    setError("");
    setNotice("Gönderi oluşturuldu.");
    e.currentTarget.reset();
    await load();
  }
  return (
    <AdminCard>
      <AdminCardHeader
        title="Kargo ve Teslimat"
        description={`${detail.order.fulfillment_status} · ${shipments.length} gönderi`}
      />
      <div className="space-y-3 border-b p-5">
        {shipments.length ? (
          shipments.map((x) => (
            <Link
              key={x.id}
              href={`/admin/kargolar/${x.id}`}
              className="flex justify-between rounded-xl border p-4 text-sm"
            >
              <span>
                <strong className="block">{x.shipment_number}</strong>
                {x.tracking_number ?? "Takip numarası bekleniyor"}
              </span>
              <strong>{SHIPPING_STATUS_LABELS[x.status]}</strong>
            </Link>
          ))
        ) : (
          <p className="text-sm text-zinc-500">Henüz gönderi oluşturulmadı.</p>
        )}
      </div>
      {notice ? (
        <p
          role="status"
          className="m-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <form onSubmit={submit} className="grid gap-3 p-5 md:grid-cols-2">
        <select name="carrier" required className={adminControlClass}>
          <option value="">Kargo firması seçin</option>
          {carriers.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <input
          name="tracking"
          placeholder="Takip numarası (opsiyonel)"
          className={adminControlClass}
        />
        {detail.items.map((x) => (
          <label key={x.id} className="text-sm font-bold">
            {x.product_name} · en fazla {x.quantity}
            <input
              name={`item-${x.id}`}
              type="number"
              min="0"
              max={x.quantity}
              defaultValue={x.quantity}
              className={`${adminControlClass} mt-1`}
            />
          </label>
        ))}
        <input
          name="estimated"
          type="date"
          aria-label="Tahmini teslimat"
          className={adminControlClass}
        />
        <input
          name="packages"
          type="number"
          min="1"
          defaultValue="1"
          placeholder="Paket adedi"
          className={adminControlClass}
        />
        <input
          name="weight"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ağırlık (kg)"
          className={adminControlClass}
        />
        <input
          name="desi"
          type="number"
          min="0"
          step="0.01"
          placeholder="Desi"
          className={adminControlClass}
        />
        <input
          name="cost"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
          placeholder="Gönderi tutarı"
          className={adminControlClass}
        />
        <textarea
          name="note"
          placeholder="Admin açıklaması"
          className={`${adminControlClass} md:col-span-2`}
        />
        <Button type="submit" className="md:col-span-2">
          Manuel gönderi oluştur
        </Button>
      </form>
    </AdminCard>
  );
}
