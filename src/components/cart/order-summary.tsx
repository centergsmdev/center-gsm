"use client";

import Link from "next/link";
import { LockKeyhole, ShieldCheck, Truck } from "lucide-react";

import { CouponForm } from "@/components/cart/coupon-form";
import { ShippingCalculator } from "@/components/cart/shipping-calculator";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";

export function OrderSummary() {
  const { totals, itemCount } = useCart();
  const totalDiscount =
    totals.productDiscount + totals.campaignDiscount + totals.couponDiscount;
  return (
    <aside
      aria-labelledby="order-summary-title"
      className="lg:sticky lg:top-44"
    >
      <Card className="home-premium-surface border-white/80 bg-white/95 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
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
        <div className="mt-5 grid gap-2">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 text-zinc-700">
            <ShieldCheck
              className="size-5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <p className="text-xs font-bold">Güvenli ve şifreli ödeme</p>
          </div>
          {totals.shipping === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-800">
              <Truck className="size-5 shrink-0" aria-hidden="true" />
              <p className="text-xs font-bold">
                Sepetiniz ücretsiz kargoya uygun
              </p>
            </div>
          ) : null}
        </div>
        <Link
          href="/odeme"
          className={buttonVariants({
            size: "lg",
            className: "mt-5 hidden w-full lg:inline-flex",
          })}
        >
          <LockKeyhole className="size-4" aria-hidden="true" />
          Güvenli Ödemeye Geç
        </Link>
      </Card>

      <Card className="mt-3 border-white/80 bg-white/90 p-4 backdrop-blur">
        <CouponForm />
        <Divider className="my-5" />
        <ShippingCalculator />
      </Card>
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-zinc-200 bg-white/95 p-3 shadow-[0_-14px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Genel toplam
            </p>
            <p className="truncate text-xl font-black tracking-[-0.04em]">
              {formatCurrency(totals.total)}
            </p>
          </div>
          <Link
            href="/odeme"
            className={buttonVariants({ size: "lg", className: "shrink-0" })}
          >
            <LockKeyhole className="size-4" aria-hidden="true" />
            Ödemeye Geç
          </Link>
        </div>
      </div>
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
