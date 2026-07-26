"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
import { adminControlClass } from "./admin-form";
import {
  addManualShipmentEvent,
  getAdminShipment,
  getAdminShippingCarriers,
  updateShipmentStatus,
  updateShipmentTracking,
  type ShipmentDetail,
} from "@/shipping/repository/shipping-repository";
import { SHIPPING_STATUS_LABELS, type ShippingStatus } from "@/shipping/types";
import type { Tables } from "@/types/database";
import { formatCurrency } from "@/lib/format";
export function AdminShipmentDetail({ id }: { id: string }) {
  const [data, setData] = useState<ShipmentDetail | null>(null),
    [carriers, setCarriers] = useState<Tables<"shipping_carriers">[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      getAdminShipment(id),
      getAdminShippingCarriers(),
    ]);
    if (d.data) setData(d.data);
    else setError(d.error ?? "Gönderi bulunamadı.");
    if (c.data) setCarriers(c.data);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (error && !data) return <AdminErrorState retry={() => void load()} />;
  if (!data) return <AdminLoadingState />;
  async function status(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      r = await updateShipmentStatus(
        id,
        String(f.get("status")) as ShippingStatus,
        String(f.get("description")),
        String(f.get("location")),
      );
    if (!r.data) setError(r.error ?? "");
    else {
      setNotice("Gönderi durumu güncellendi.");
      await load();
    }
  }
  async function tracking(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      r = await updateShipmentTracking(
        id,
        String(f.get("carrier")),
        String(f.get("tracking")),
        String(f.get("estimated")),
        String(f.get("note")),
      );
    if (!r.data) setError(r.error ?? "");
    else {
      setNotice("Takip bilgileri güncellendi.");
      await load();
    }
  }
  async function event(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      r = await addManualShipmentEvent(
        id,
        String(f.get("title")),
        String(f.get("description")),
        String(f.get("location")),
      );
    if (!r.data) setError(r.error ?? "");
    else {
      setNotice("Zaman çizelgesi olayı eklendi.");
      e.currentTarget.reset();
      await load();
    }
  }
  const s = data.shipment;
  return (
    <div className="space-y-5">
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <AdminCard>
        <AdminCardHeader
          title={s.shipment_number}
          description={`${data.carrier?.name ?? "Kargo"} · ${SHIPPING_STATUS_LABELS[s.status]}`}
          action={
            <Link
              href={`/admin/kargolar/${id}/etiket`}
              className="font-bold text-red-600"
            >
              Etiketi yazdır
            </Link>
          }
        />
        <div className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info l="Sipariş" v={data.order?.order_number ?? "—"} />
          <Info l="Takip numarası" v={s.tracking_number ?? "—"} />
          <Info l="Kargo ücreti" v={formatCurrency(s.shipping_cost)} />
          <Info
            l="Tahmini teslimat"
            v={
              s.estimated_delivery_at
                ? new Date(s.estimated_delivery_at).toLocaleDateString("tr-TR")
                : "—"
            }
          />
        </div>
      </AdminCard>
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader title="Gönderilen ürünler" />
          <div className="space-y-2 p-5">
            {data.items.map((x) => (
              <div
                key={x.id}
                className="flex justify-between rounded-xl border p-3"
              >
                <span>{x.orderItem?.product_name ?? "Ürün"}</span>
                <strong>{x.quantity} adet</strong>
              </div>
            ))}
          </div>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader title="Zaman çizelgesi" />
          <ol className="space-y-4 p-5">
            {data.events.map((x) => (
              <li key={x.id} className="border-l-2 border-red-600 pl-4">
                <p className="font-bold">{x.title}</p>
                <p className="text-sm text-zinc-600">{x.description}</p>
                <time className="text-xs text-zinc-500">
                  {new Date(x.event_time).toLocaleString("tr-TR")}
                </time>
              </li>
            ))}
          </ol>
        </AdminCard>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <AdminCard>
          <AdminCardHeader title="Takip bilgileri" />
          <form onSubmit={tracking} className="space-y-3 p-5">
            <select
              name="carrier"
              defaultValue={s.carrier_id}
              className={adminControlClass}
            >
              {carriers
                .filter((x) => x.is_active)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
            <input
              name="tracking"
              defaultValue={s.tracking_number ?? ""}
              placeholder="Takip numarası"
              className={adminControlClass}
            />
            <input
              name="estimated"
              type="date"
              defaultValue={s.estimated_delivery_at?.slice(0, 10)}
              className={adminControlClass}
            />
            <textarea
              name="note"
              defaultValue={s.admin_note ?? ""}
              placeholder="Admin notu"
              className={adminControlClass}
            />
            <Button type="submit">Kaydet</Button>
          </form>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader title="Durum güncelle" />
          <form onSubmit={status} className="space-y-3 p-5">
            <select
              name="status"
              defaultValue={s.status}
              className={adminControlClass}
            >
              {Object.entries(SHIPPING_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              name="location"
              placeholder="Konum"
              className={adminControlClass}
            />
            <textarea
              name="description"
              placeholder="Açıklama"
              className={adminControlClass}
            />
            <Button type="submit">Durumu uygula</Button>
          </form>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader title="Manuel olay ekle" />
          <form onSubmit={event} className="space-y-3 p-5">
            <input
              name="title"
              required
              placeholder="Olay başlığı"
              className={adminControlClass}
            />
            <input
              name="location"
              placeholder="Konum"
              className={adminControlClass}
            />
            <textarea
              name="description"
              placeholder="Açıklama"
              className={adminControlClass}
            />
            <Button type="submit">Olay ekle</Button>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
function Info({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-zinc-500">{l}</p>
      <p className="mt-1 font-bold">{v}</p>
    </div>
  );
}
