"use client";

import Link from "next/link";
import { PackageCheck, RefreshCcw, ShieldCheck } from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { formatCurrency } from "@/lib/format";
import { productDisplayName } from "@/lib/catalog/variants";
import { useCart } from "@/providers/cart-provider";

export function CheckoutSummary({
  deliveryCost,
  loyaltyDiscount = 0,
  giftCardAmount = 0,
  storeCreditAmount = 0,
}: {
  deliveryCost: number;
  loyaltyDiscount?: number;
  giftCardAmount?: number;
  storeCreditAmount?: number;
}) {
  const { lines, totals, itemCount } = useCart();
  const discount =
    totals.productDiscount + totals.campaignDiscount + totals.couponDiscount;
  const shipping = totals.shipping + deliveryCost;
  const total = Math.max(
    0,
    totals.total +
      deliveryCost -
      loyaltyDiscount -
      giftCardAmount -
      storeCreditAmount,
  );
  return (
    <aside
      className="lg:sticky lg:top-36"
      aria-labelledby="checkout-summary-title"
    >
      <Card className="home-premium-surface rounded-2xl border-white/80 bg-white/95 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="checkout-summary-title" className="text-lg font-black">
              Sipariş Özeti
            </h2>
            <p className="mt-1 text-xs text-muted">{itemCount} ürün</p>
          </div>
          <Link
            href="/sepet"
            className="rounded-sm text-xs font-bold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Düzenle
          </Link>
        </div>
        <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
          {lines.map((line) => (
            <li key={line.id} className="flex gap-3">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-white [&_span]:hidden">
                <ProductVisual product={line.product} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black">
                  {productDisplayName(line.product)}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Adet: {line.quantity}
                </p>
                {line.variant ? (
                  <p className="mt-1 text-[10px] leading-4 text-muted">
                    {line.variant.colorName
                      ? `${line.variant.colorName} · `
                      : ""}
                    {line.variant.storageValue
                      ? `${line.variant.storageValue} ${line.variant.storageUnit} · `
                      : ""}
                    SKU: {line.variant.sku}
                  </p>
                ) : null}
                <p className="mt-1 text-xs font-bold">
                  {formatCurrency(line.lineTotal)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <Divider className="my-5" />
        <dl className="space-y-3 text-sm">
          <SummaryRow
            label="Ara toplam"
            value={formatCurrency(totals.listSubtotal)}
          />
          <SummaryRow
            label="İndirim"
            value={
              discount ? `−${formatCurrency(discount)}` : formatCurrency(0)
            }
            highlight
          />
          <SummaryRow
            label="Kargo"
            value={shipping === 0 ? "Ücretsiz" : formatCurrency(shipping)}
            highlight={shipping === 0}
          />
          {loyaltyDiscount ? (
            <SummaryRow
              label="Puan indirimi"
              value={`−${formatCurrency(loyaltyDiscount)}`}
              highlight
            />
          ) : null}
          {giftCardAmount ? (
            <SummaryRow
              label="Hediye kartı"
              value={`−${formatCurrency(giftCardAmount)}`}
              highlight
            />
          ) : null}
          {storeCreditAmount ? (
            <SummaryRow
              label="Mağaza bakiyesi"
              value={`−${formatCurrency(storeCreditAmount)}`}
              highlight
            />
          ) : null}
          <SummaryRow label="KDV" value={formatCurrency(totals.vatIncluded)} />
        </dl>
        <Divider className="my-5" />
        <div className="flex items-end justify-between">
          <div>
            <p className="font-black">Genel Toplam</p>
            <p className="mt-1 text-[10px] text-muted">KDV dahil</p>
          </div>
          <p className="text-2xl font-black tracking-tight">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="mt-5 grid gap-2">
          <TrustRow
            icon={ShieldCheck}
            title="Güvenli ödeme"
            description="Hassas ödeme bilgileri bu sitede saklanmaz."
          />
          <TrustRow
            icon={PackageCheck}
            title="Orijinal ürün garantisi"
            description="Ürünler faturalı ve garanti kapsamındadır."
          />
          <TrustRow
            icon={RefreshCcw}
            title="Kolay iade talebi"
            description="Hesabınızdan iade talebi oluşturabilirsiniz."
          />
        </div>
      </Card>
    </aside>
  );
}

function TrustRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-black text-zinc-900">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted">{description}</p>
      </div>
    </div>
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
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={highlight ? "font-bold text-success" : "font-semibold"}>
        {value}
      </dd>
    </div>
  );
}
