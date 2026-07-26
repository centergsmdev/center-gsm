"use client";
import Link from "next/link";
import { ArrowLeft, MapPin, Package, Plus, Tag, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_SEGMENTS,
  CUSTOMER_STATUSES,
  SEGMENT_LABELS,
  addCustomerNote,
  addCustomerTag,
  formatCrmCurrency,
  formatCrmDate,
  getCustomerProfile,
  removeCustomerTag,
  updateCustomerProfile,
} from "@/lib/crm";
import type {
  CustomerDetail,
  CustomerSegment,
  CustomerStatus,
} from "@/lib/crm";
export function AdminCustomerDetail({ id }: { id: string }) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const result = await getCustomerProfile(id);
    setData(result.data);
    setError(result.error ?? "");
    setLoading(false);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const update = async (
    status: CustomerStatus,
    segment: CustomerSegment,
    marketingOptIn: boolean,
  ) => {
    setSaving(true);
    const result = await updateCustomerProfile({
      customerId: id,
      status,
      segment,
      marketingOptIn,
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else await load();
  };
  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const result = await addCustomerNote(id, note, true);
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      setNote("");
      await load();
    }
  };
  const saveTag = async () => {
    if (!tag.trim()) return;
    setSaving(true);
    const result = await addCustomerTag(id, tag, "#dc2626");
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      setTag("");
      await load();
    }
  };
  if (loading) return <AdminLoadingState />;
  if (error && !data) return <AdminErrorState />;
  if (!data) return <AdminEmptyState title="Müşteri bulunamadı" />;
  const p = data.profile;
  return (
    <div className="space-y-5">
      <Link
        prefetch={false}
        href="/admin/musteriler"
        className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600"
      >
        <ArrowLeft className="size-4" />
        Müşterilere dön
      </Link>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <AdminCard>
          <AdminCardHeader
            title={p.full_name || "İsimsiz müşteri"}
            description={`${p.email} · ${p.phone ?? "Telefon yok"}`}
            action={
              <AdminBadge variant={p.segment === "vip" ? "warning" : "info"}>
                {SEGMENT_LABELS[p.segment]}
              </AdminBadge>
            }
          />
          <div className="grid gap-5 p-6 sm:grid-cols-3">
            <Metric
              label="Yaşam boyu değer"
              value={formatCrmCurrency(p.lifetime_value)}
            />
            <Metric
              label="Ortalama sepet"
              value={formatCrmCurrency(data.averageOrderValue)}
            />
            <Metric label="Toplam sipariş" value={String(p.order_count)} />
            <Metric
              label="Son sipariş"
              value={formatCrmDate(p.last_order_at)}
            />
            <Metric label="Son giriş" value={formatCrmDate(p.last_login_at)} />
            <Metric
              label="Pazarlama izni"
              value={p.marketing_opt_in ? "Açık" : "Kapalı"}
            />
          </div>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader title="CRM ayarları" />
          <div className="space-y-3 p-5">
            <Select
              label="Segment"
              value={p.segment}
              values={CUSTOMER_SEGMENTS}
              onChange={(value) =>
                void update(
                  p.status,
                  value as CustomerSegment,
                  p.marketing_opt_in,
                )
              }
            />
            <Select
              label="Durum"
              value={p.status}
              values={CUSTOMER_STATUSES}
              onChange={(value) =>
                void update(
                  value as CustomerStatus,
                  p.segment,
                  p.marketing_opt_in,
                )
              }
            />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={p.marketing_opt_in}
                disabled={saving}
                onChange={(e) =>
                  void update(p.status, p.segment, e.target.checked)
                }
              />
              Pazarlama izni
            </label>
          </div>
        </AdminCard>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader title="Adresler" />
          <div className="space-y-3 p-5">
            {data.addresses.length ? (
              data.addresses.map((address) => (
                <div
                  key={address.id}
                  className="flex gap-3 rounded-xl border p-3"
                >
                  <MapPin className="mt-0.5 size-4 text-red-600" />
                  <div>
                    <p className="font-bold">{address.title}</p>
                    <p className="text-sm text-zinc-500">
                      {address.address_line}, {address.district}/{address.city}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">Adres bulunmuyor.</p>
            )}
          </div>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader title="Etiketler" />
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {data.tags.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.name}
                  <button
                    type="button"
                    aria-label={`${item.name} etiketini kaldır`}
                    onClick={() =>
                      void removeCustomerTag(id, item.id).then(() => load())
                    }
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Yeni etiket"
                className="h-10 flex-1 rounded-xl border px-3"
              />
              <Button
                size="sm"
                onClick={() => void saveTag()}
                disabled={saving}
              >
                <Tag className="size-4" />
                Ekle
              </Button>
            </div>
          </div>
        </AdminCard>
      </div>
      <AdminCard>
        <AdminCardHeader
          title="Sipariş geçmişi"
          description={`${data.orders.length} sipariş`}
        />
        <div className="divide-y">
          {data.orders.length ? (
            data.orders.map((order) => (
              <Link
                prefetch={false}
                key={order.id}
                href={`/admin/siparisler/${order.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-zinc-50"
              >
                <div className="flex items-center gap-3">
                  <Package className="size-5 text-zinc-400" />
                  <div>
                    <p className="font-bold">{order.order_number}</p>
                    <p className="text-xs text-zinc-500">
                      {formatCrmDate(order.created_at)} · {order.status}
                    </p>
                  </div>
                </div>
                <strong>{formatCrmCurrency(order.grand_total)}</strong>
              </Link>
            ))
          ) : (
            <p className="p-5 text-sm text-zinc-500">Sipariş bulunmuyor.</p>
          )}
        </div>
      </AdminCard>
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader title="Ödemeler ve gönderiler" />
          <div className="space-y-3 p-5">
            <p className="text-sm font-bold">
              {data.payments.length} ödeme işlemi · {data.shipments.length}{" "}
              gönderi
            </p>
            {data.payments.slice(0, 5).map((payment) => (
              <p key={payment.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
                {payment.provider} · {payment.status} ·{" "}
                {formatCrmCurrency(payment.amount)}
              </p>
            ))}
            {data.shipments.slice(0, 5).map((shipment) => (
              <p
                key={shipment.id}
                className="rounded-lg bg-zinc-50 p-3 text-sm"
              >
                Kargo {shipment.shipment_number} · {shipment.status}
              </p>
            ))}
          </div>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader title="Yönetim notları" />
          <div className="p-5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Yalnızca yöneticilerin görebileceği not…"
              className="w-full rounded-xl border p-3"
            />
            <Button
              className="mt-2"
              size="sm"
              onClick={() => void saveNote()}
              disabled={saving}
            >
              <Plus className="size-4" />
              Not ekle
            </Button>
            <div className="mt-4 space-y-3">
              {data.notes.map((item) => (
                <div key={item.id} className="rounded-xl bg-zinc-50 p-3">
                  <p className="text-sm">{item.note}</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    {formatCrmDate(item.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>
      <AdminCard>
        <AdminCardHeader title="Aktivite zaman çizelgesi" />
        <ol className="space-y-0 p-5">
          {data.activity.map((item) => (
            <li
              key={item.id}
              className="relative border-l border-zinc-200 pb-5 pl-5 last:pb-0"
            >
              <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-red-600" />
              <p className="font-bold">{item.description}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {item.activity_type} · {formatCrmDate(item.created_at)}
              </p>
            </li>
          ))}
        </ol>
      </AdminCard>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-zinc-400">{label}</p>
      <p className="mt-1 font-black text-zinc-950">{value}</p>
    </div>
  );
}
function Select({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-bold">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-xl border bg-white px-3 font-normal"
      >
        {values.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}
