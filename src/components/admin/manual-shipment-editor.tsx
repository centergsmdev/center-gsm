"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { adminControlClass } from "./admin-form";
import {
  getAdminShipment,
  getAdminShippingCarriers,
  updateManualShipmentExperience,
} from "@/shipping/repository/shipping-repository";
import type { ShipmentDetail } from "@/shipping/repository/shipping-repository";
import type { Tables } from "@/types/database";
const statuses = [
  ["preparing", "Hazırlanıyor"],
  ["shipped", "Kargoya Verildi"],
  ["in_transit", "Transfer Sürecinde"],
  ["out_for_delivery", "Dağıtıma Çıktı"],
  ["delivered", "Teslim Edildi"],
  ["delivery_failed", "Teslim Edilemedi"],
  ["return_started", "İade Sürecinde"],
  ["returned", "İade Edildi"],
] as const;
export function ManualShipmentEditor({ id }: { id: string }) {
  const [data, setData] = useState<ShipmentDetail | null>(null),
    [carriers, setCarriers] = useState<Tables<"shipping_carriers">[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const [shipment, carrierResult] = await Promise.all([
      getAdminShipment(id),
      getAdminShippingCarriers(),
    ]);
    setData(shipment.data);
    setCarriers(carrierResult.data?.filter((item) => item.is_active) ?? []);
  }, [id]);
  useEffect(() => void load(), [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await updateManualShipmentExperience({
      shipmentId: id,
      carrierId: String(form.get("carrier")),
      trackingNumber: String(form.get("tracking")),
      trackingUrl: String(form.get("url")),
      shippingNote: String(form.get("note")),
      estimatedAt: String(form.get("estimated")),
      status: String(form.get("status")),
    });
    if (!result.data) setError(result.error ?? "");
    else {
      setNotice("Manuel kargo bilgileri güncellendi.");
      setError("");
      await load();
    }
  }
  if (!data) return null;
  const shipment = data.shipment;
  return (
    <AdminCard>
      <AdminCardHeader
        title="Manuel Kargo Operasyonu"
        description={`${data.order?.selected_shipping_name ?? data.carrier?.name ?? "Kargo"} · müşteri tercihi ve takip yönetimi`}
      />
      {notice ? (
        <p
          role="status"
          className="m-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <form onSubmit={submit} className="grid gap-3 p-5 md:grid-cols-2">
        <label className="text-sm font-bold">
          Kargo firması
          <select
            name="carrier"
            defaultValue={shipment.carrier_id}
            className={`${adminControlClass} mt-1`}
          >
            {carriers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Kargo durumu
          <select
            name="status"
            defaultValue={shipment.status}
            className={`${adminControlClass} mt-1`}
          >
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Takip numarası
          <input
            name="tracking"
            defaultValue={shipment.tracking_number ?? ""}
            className={`${adminControlClass} mt-1`}
          />
        </label>
        <label className="text-sm font-bold">
          Takip linki
          <input
            name="url"
            type="url"
            placeholder="https://"
            defaultValue={shipment.tracking_url ?? ""}
            className={`${adminControlClass} mt-1`}
          />
        </label>
        <label className="text-sm font-bold">
          Tahmini teslim tarihi
          <input
            name="estimated"
            type="datetime-local"
            defaultValue={shipment.estimated_delivery_at?.slice(0, 16) ?? ""}
            className={`${adminControlClass} mt-1`}
          />
        </label>
        <label className="text-sm font-bold">
          Kargo notu
          <textarea
            name="note"
            maxLength={240}
            defaultValue={
              shipment.admin_note ?? data.order?.shipping_note ?? ""
            }
            className={`${adminControlClass} mt-1`}
          />
        </label>
        <Button type="submit" className="md:col-span-2">
          Kargo bilgilerini güncelle
        </Button>
      </form>
    </AdminCard>
  );
}
