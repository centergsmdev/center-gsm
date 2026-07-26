"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, MapPin, PackageCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { DemoOrder } from "@/types/checkout";

export function OrderSuccess() {
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem("center-gsm-demo-order");
      if (stored) setOrder(JSON.parse(stored) as DemoOrder);
    } finally {
      setReady(true);
    }
  }, []);
  if (!ready)
    return (
      <div aria-busy="true" aria-label="Sipariş bilgileri yükleniyor">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <Skeleton className="mx-auto mt-6 h-10 max-w-md" />
        <Skeleton className="mx-auto mt-8 h-96 max-w-3xl rounded-xl" />
      </div>
    );
  if (!order)
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <PackageCheck
          className="mx-auto size-10 text-primary"
          aria-hidden="true"
        />
        <h1 className="mt-5 text-2xl font-black">Demo sipariş bulunamadı</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Yeni bir demo sipariş oluşturmak için sepetinize ürün ekleyin.
        </p>
        <Link href="/urunler" className={buttonVariants({ className: "mt-6" })}>
          Ürünleri İncele
        </Link>
      </Card>
    );
  return (
    <div>
      <div className="text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
          <Check className="size-9" strokeWidth={3} aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-success">
          Sipariş başarıyla alındı
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
          Siparişiniz oluşturuldu
        </h1>
        <p className="mt-3 text-sm text-muted">
          Sipariş numarası:{" "}
          <strong className="text-foreground">{order.orderNumber}</strong>
        </p>
      </div>
      <div className="mx-auto mt-9 grid max-w-4xl gap-5 md:grid-cols-2">
        <Card id="siparis-detayi" className="p-5 sm:p-6">
          <h2 className="text-lg font-black">Sipariş Özeti</h2>
          <ul className="mt-5 space-y-4">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4 text-sm">
                <div>
                  <Link
                    href={`/urun/${line.slug}`}
                    className="font-bold hover:text-primary"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {line.quantity} adet
                  </p>
                </div>
                <strong>{formatCurrency(line.lineTotal)}</strong>
              </li>
            ))}
          </ul>
          <Divider className="my-5" />
          <dl className="space-y-2 text-sm">
            <Row label="Ara toplam" value={formatCurrency(order.subtotal)} />
            <Row label="İndirim" value={`−${formatCurrency(order.discount)}`} />
            <Row
              label="Kargo"
              value={
                order.shipping ? formatCurrency(order.shipping) : "Ücretsiz"
              }
            />
            <Row label="KDV" value={formatCurrency(order.vat)} />
          </dl>
          <Divider className="my-5" />
          <div className="flex justify-between text-lg font-black">
            <span>Genel Toplam</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex gap-3">
              <MapPin
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-black">Teslimat Adresi</h2>
                <p className="mt-2 text-sm font-semibold">
                  {order.customerName}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {order.addressSummary}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex gap-3">
              <CalendarDays
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-black">Tahmini Teslimat</h2>
                <p className="mt-2 text-sm font-semibold">
                  {order.estimatedDelivery}
                </p>
                <p className="mt-1 text-xs text-muted">{order.deliveryLabel}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/urunler" className={buttonVariants({ size: "lg" })}>
          Alışverişe Devam Et
        </Link>
        <Link
          href={`/siparis/${encodeURIComponent(order.orderNumber)}`}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Sipariş Detayına Git
        </Link>
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Siparişiniz güvenli biçimde kaydedildi. Bu aşamada gerçek ödeme
        alınmamıştır.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
