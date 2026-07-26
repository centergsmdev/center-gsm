"use client";

import Link from "next/link";
import { CalendarDays, LockKeyhole } from "lucide-react";

import { CouponForm } from "@/components/cart/coupon-form";
import { ShippingCalculator } from "@/components/cart/shipping-calculator";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";

export function OrderSummary() {
  const { totals, itemCount } = useCart();
  const totalDiscount = totals.productDiscount + totals.campaignDiscount + totals.couponDiscount;
  return (
    <aside
      aria-labelledby="order-summary-title"
      className="lg:sticky lg:top-44"
    >
      <Card className="border-white/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.1)] backdrop-blur sm:p-5">
        <h2
          id="order-summary-title"
          className="text-lg font-black tracking-tight"
        >
          Sipariş Özeti
        </h2>
        <p className="mt-1 text-xs text-muted">{itemCount} ürün</p>
        <dl className="mt-5 space-y-3 text-sm">
          <SummaryRow
            label="Ara toplam"
            value={formatCurrency(totals.listSubtotal)}
          />
          <SummaryRow
            label="İndirim"
            value={
              totalDiscount > 0
                ? `−${formatCurrency(totalDiscount)}`
                : formatCurrency(0)
            }
            highlight
          />
          <SummaryRow
            label="Kargo"
            value={
              totals.shipping === 0
                ? "Ücretsiz"
                : formatCurrency(totals.shipping)
            }
            highlight={totals.shipping === 0}
          />
        </dl>
        <Divider className="my-5" />
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Genel Toplam</p>
            <p className="mt-1 text-[11px] text-muted">KDV dahil</p>
          </div>
          <p className="text-2xl font-black tracking-[-0.04em]">
            {formatCurrency(totals.total)}
          </p>
        </div>
        <p className="mt-2 text-right text-[11px] text-muted">
          {formatCurrency(totals.vatIncluded)} KDV dahildir
        </p>
        <div className="mt-5 flex items-center gap-3 rounded-md bg-emerald-50 p-3 text-emerald-800">
          <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold">Tahmini teslimat</p>
            <p className="mt-0.5 text-[11px]">29–31 Temmuz</p>
          </div>
        </div>
        <Link
          href="/odeme"
          className={buttonVariants({ size: "lg", className: "mt-5 w-full" })}
        >
          <LockKeyhole className="size-4" aria-hidden="true" />
          Güvenli Ödemeye Geç
        </Link>
        <p className="mt-3 text-center text-[11px] leading-5 text-muted">
          Demo checkout; gerçek ödeme alınmaz.
        </p>
      </Card>

      <Card className="mt-3 border-white/80 bg-white/90 p-4 backdrop-blur">
        <CouponForm />
        <Divider className="my-5" />
        <ShippingCalculator />
      </Card>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd
        className={
          highlight ? "font-bold text-success" : "font-semibold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
