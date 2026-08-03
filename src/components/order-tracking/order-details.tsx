"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, MapPin } from "lucide-react";

import { CargoTracking } from "@/components/order-tracking/cargo-tracking";
import { OrderDetailNotFound } from "@/components/order-tracking/order-detail-not-found";
import { OrderTimeline } from "@/components/order-tracking/order-timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderByReference } from "@/lib/orders/client";
import { mapOrderDetail } from "@/lib/orders/mapper";
import { formatCurrency } from "@/lib/format";
import type { TrackedOrder } from "@/types/order-tracking";
export function OrderDetails({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const normalized = decodeURIComponent(orderNumber).toUpperCase();
      try {
        const stored = window.sessionStorage.getItem("center-gsm-order-access");
        let contact = "";
        if (stored) {
          const parsed = JSON.parse(stored) as {
            orderNumber: string;
            contact: string;
          };
          if (parsed.orderNumber.toUpperCase() === normalized) {
            contact = parsed.contact;
          }
        }
        const result = await getOrderByReference(normalized, contact);
        if (active && result.data) setOrder(mapOrderDetail(result.data));
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderNumber]);
  if (!ready) return <OrderDetailsSkeleton />;
  if (!order) return <OrderDetailNotFound />;
  const stageLabels = {
    received: "Sipariş alındı",
    paid: "Ödeme onaylandı",
    preparing: "Hazırlanıyor",
    shipped: "Kargoya verildi",
    delivered: "Teslim edildi",
    cancelled: "İptal edildi",
  };
  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-full">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Sipariş detayı
          </p>
          <h1 className="mt-2 break-all text-2xl font-black tracking-[-0.045em] min-[360px]:text-3xl sm:break-normal sm:text-4xl">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-sm text-muted">{order.orderDate}</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-800">
          {stageLabels[order.stage]}
        </span>
      </div>
      <Card className="mt-5 max-w-full p-4 shadow-sm sm:mt-7 sm:p-7">
        <OrderTimeline currentStage={order.stage} />
      </Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-5">
          <OrderItems order={order} />
          {order.shipments?.length ? (
            <ShipmentCards shipments={order.shipments} />
          ) : (
            <CargoTracking
              cargo={order.cargo}
              shipped={order.stage === "shipped" || order.stage === "delivered"}
            />
          )}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-36">
          <OrderInformation order={order} />
          <Card className="p-5">
            <h2 className="font-black">Sipariş İşlemleri</h2>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" className="w-full" disabled>
                <Download className="size-4" aria-hidden="true" />
                Faturayı İndir
              </Button>
              <Button variant="ghost" className="w-full" disabled>
                İptal Talebi Oluştur
              </Button>
              <Button variant="ghost" className="w-full" disabled>
                İade Talebi Oluştur
              </Button>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted">
              Fatura, iptal ve iade işlemleri çevrimiçi olarak henüz
              kullanılamıyor.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
function ShipmentCards({
  shipments,
}: {
  shipments: NonNullable<TrackedOrder["shipments"]>;
}) {
  return (
    <section className="space-y-4" aria-label="Kargo gönderileri">
      {shipments.map((s) => (
        <Card key={s.id} className="max-w-full overflow-hidden p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-full">
              <p className="text-xs font-black uppercase text-primary">
                {s.carrier}
              </p>
              <h2 className="mt-1 break-all text-base font-black sm:text-lg">
                {s.number}
              </h2>
              <p className="mt-1 break-all text-sm text-zinc-600">
                Takip: {s.trackingNumber ?? "Bekleniyor"}
              </p>
            </div>
            {s.trackingUrl ? (
              <a
                href={s.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-full break-words text-sm font-bold text-primary"
              >
                Kargo firmasında takip et
              </a>
            ) : null}
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <p>
              Durum: <strong>{s.status}</strong>
            </p>
            <p>
              Tahmini:{" "}
              <strong>
                {s.estimatedAt
                  ? new Date(s.estimatedAt).toLocaleDateString("tr-TR")
                  : "—"}
              </strong>
            </p>
            <p>
              Teslim:{" "}
              <strong>
                {s.deliveredAt
                  ? new Date(s.deliveredAt).toLocaleDateString("tr-TR")
                  : "—"}
              </strong>
            </p>
          </div>
          <div className="mt-4 border-t pt-4">
            {s.items.map((x, i) => (
              <p key={`${x.name}-${i}`} className="break-words text-sm">
                {x.name} · <strong>{x.quantity} adet</strong>
              </p>
            ))}
          </div>
          <ol className="mt-4 space-y-3 border-t pt-4">
            {s.events.map((e, i) => (
              <li
                key={`${e.date}-${i}`}
                className="min-w-0 border-l-2 border-primary pl-3 text-sm"
              >
                <strong className="break-words">{e.description}</strong>
                <p className="mt-1 break-words text-xs text-zinc-500">
                  {e.location} · {new Date(e.date).toLocaleString("tr-TR")}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      ))}
    </section>
  );
}

function OrderItems({ order }: { order: TrackedOrder }) {
  return (
    <Card className="max-w-full overflow-hidden p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-black">Ürünler ve Tutarlar</h2>
      </div>
      <div className="mt-4 space-y-3 md:hidden">
        {order.items.map((item) => (
          <article
            key={item.id}
            className="min-w-0 rounded-xl border border-border bg-white p-3.5 shadow-sm"
          >
            <Link
              href={`/urun/${item.slug}`}
              className="block break-words text-sm font-black leading-5 hover:text-primary"
            >
              {item.name}
            </Link>
            <p className="mt-1 break-all text-[10px] text-muted">
              SKU: {item.sku ?? item.id.toUpperCase()}
            </p>
            {item.variantLabel ? (
              <p className="mt-1 break-words text-[10px] font-semibold text-muted">
                {item.variantLabel}
              </p>
            ) : null}
            <dl className="mt-3 divide-y divide-border border-t border-border">
              <MobileItemValue label="Adet" value={String(item.quantity)} />
              <MobileItemValue
                label="Birim fiyat"
                value={formatCurrency(item.unitPrice)}
              />
              <MobileItemValue
                label="Toplam"
                value={formatCurrency(item.unitPrice * item.quantity)}
                strong
              />
            </dl>
          </article>
        ))}
      </div>
      <div className="mt-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-border text-[10px] font-black uppercase tracking-wider text-muted">
              <th className="pb-3">Ürün</th>
              <th className="pb-3 text-center">Adet</th>
              <th className="pb-3 text-right">Birim fiyat</th>
              <th className="pb-3 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-border text-sm">
                <td className="py-4">
                  <Link
                    href={`/urun/${item.slug}`}
                    className="font-bold hover:text-primary"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-[10px] text-muted">
                    SKU: {item.sku ?? item.id.toUpperCase()}
                  </p>
                  {item.variantLabel ? (
                    <p className="mt-1 text-[10px] font-semibold text-muted">
                      {item.variantLabel}
                    </p>
                  ) : null}
                </td>
                <td className="py-4 text-center">{item.quantity}</td>
                <td className="py-4 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-4 text-right font-black">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-4 space-y-2.5 rounded-xl border border-border bg-surface-subtle p-3.5 text-sm md:ml-auto md:mt-5 md:max-w-sm md:space-y-3 md:border-0 md:bg-transparent md:p-0">
        <Summary label="Ara toplam" value={formatCurrency(order.subtotal)} />
        <Summary label="İndirim" value={`−${formatCurrency(order.discount)}`} />
        {order.appliedDiscounts.map((label) => (
          <Summary key={label} label="Uygulanan indirim" value={label} />
        ))}
        <Summary
          label="Kargo"
          value={order.shipping ? formatCurrency(order.shipping) : "Ücretsiz"}
        />
        <Summary label="KDV" value={formatCurrency(order.vat)} />
        <Divider />
        <Summary
          label="Genel toplam"
          value={formatCurrency(order.total)}
          strong
        />
      </dl>
    </Card>
  );
}

function OrderInformation({ order }: { order: TrackedOrder }) {
  return (
    <Card className="max-w-full overflow-hidden p-4 sm:p-5">
      <h2 className="font-black">Sipariş Bilgileri</h2>
      <dl className="mt-4 space-y-4">
        <Info label="Ödeme yöntemi" value={order.paymentMethod} />
        <Info label="Teslimat yöntemi" value={order.deliveryMethod} />
      </dl>
      <Divider className="my-5" />
      <div className="flex gap-3">
        <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-black">Teslimat Adresi</h3>
          <p className="mt-1 text-xs font-semibold">{order.customerName}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {order.deliveryAddress}
          </p>
        </div>
      </div>
      <Divider className="my-5" />
      <h3 className="text-sm font-black">Fatura Bilgileri</h3>
      <p className="mt-2 text-xs font-semibold">
        {order.invoice.type} · {order.invoice.name}
      </p>
      <p className="mt-1 text-xs text-muted">{order.invoice.address}</p>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words text-xs font-black">{value}</dd>
    </div>
  );
}
function MobileItemValue({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right text-xs ${strong ? "font-black text-primary" : "font-bold"}`}
      >
        {value}
      </dd>
    </div>
  );
}
function Summary({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? "text-lg font-black" : ""}`}
    >
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
function OrderDetailsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Sipariş detayları yükleniyor">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="mt-7 h-44 rounded-xl" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-[520px] rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
