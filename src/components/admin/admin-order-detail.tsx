"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, MapPin, MessageCircle, PhoneCall } from "lucide-react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
import { adminControlClass } from "./admin-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdminOrderShipping } from "./admin-order-shipping";
import { AdminOrderShippingPreference } from "./admin-order-shipping-preference";
import {
  getAdminOrder,
  parseOrderAddress,
  parseOrderHistory,
  updateAdminOrder,
  updateManualPayment,
} from "@/lib/admin/orders";
import { formatCurrency } from "@/lib/format";
import type {
  OrderDetail,
  OrderPaymentStatus,
  OrderStatus,
} from "@/types/order-management";

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [paymentAction, setPaymentAction] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminOrder(orderId);
    if (!result.data) setError(result.error ?? "Sipariş bulunamadı.");
    else {
      setDetail(result.data);
      setError("");
    }
    setLoading(false);
  }, [orderId]);
  useEffect(() => {
    void load();
  }, [load]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    const result = await updateAdminOrder(
      orderId,
      String(data.get("status")) as OrderStatus,
      String(data.get("paymentStatus")) as OrderPaymentStatus,
      String(data.get("note") ?? ""),
      data.get("restoreStock") === "on",
    );
    setSaving(false);
    if (!result.data) {
      setError(result.error ?? "Sipariş güncellenemedi.");
      return;
    }
    setNotice("Sipariş başarıyla güncellendi.");
    await load();
  };
  if (loading) return <AdminLoadingState />;
  if (error || !detail) return <AdminErrorState retry={() => void load()} />;
  const order = detail.order;
  const delivery = parseOrderAddress(order.delivery_address);
  const billing = parseOrderAddress(order.billing_address);
  const history = parseOrderHistory(order.status_history);
  const campaigns = Array.isArray(order.campaign_snapshots)
    ? order.campaign_snapshots.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
          return [];
        return typeof entry.name === "string" ? [entry.name] : [];
      })
    : [];
  const coupon =
    order.coupon_snapshot &&
    typeof order.coupon_snapshot === "object" &&
    !Array.isArray(order.coupon_snapshot) &&
    typeof order.coupon_snapshot.code === "string"
      ? order.coupon_snapshot.code
      : null;
  const paymentAccount =
    order.payment_account_snapshot &&
    typeof order.payment_account_snapshot === "object" &&
    !Array.isArray(order.payment_account_snapshot)
      ? order.payment_account_snapshot
      : null;
  const paymentMethodLabel =
    order.payment_method === "transfer"
      ? "Havale / EFT"
      : "Online Kart ile Öde (Telefon ile Onay)";
  const phone = String(delivery.phone ?? "");
  const phoneHref = phone.replace(/[^+\d]/g, "");
  const runPaymentAction = async (
    action: "paid" | "rejected" | "unreachable" | "waiting",
  ) => {
    setPaymentAction(action);
    const result = await updateManualPayment(
      orderId,
      action,
      order.admin_note ?? "",
    );
    setPaymentAction(null);
    if (result.error) setError(result.error);
    else {
      setNotice("Ödeme durumu güncellendi.");
      await load();
    }
  };
  return (
    <div className="space-y-5">
      <Link
        href="/admin/siparisler"
        className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft className="size-4" />
        Siparişlere dön
      </Link>
      {notice ? (
        <p
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
          role="status"
        >
          <Check className="size-4" />
          {notice}
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <AdminCard>
            <AdminCardHeader
              title={order.order_number}
              description={new Intl.DateTimeFormat("tr-TR", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(new Date(order.created_at))}
              action={
                <AdminBadge
                  variant={order.status === "cancelled" ? "danger" : "warning"}
                >
                  {order.status}
                </AdminBadge>
              }
            />
            <div className="p-5 sm:p-6">
              <h3 className="font-bold">Sipariş ürünleri</h3>
              <div className="mt-4 divide-y divide-zinc-100">
                {detail.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] gap-4 py-4 text-sm"
                  >
                    <div>
                      <p className="font-bold text-zinc-950">
                        {item.product_name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        SKU: {item.sku} · {item.quantity} adet
                      </p>
                    </div>
                    <p className="font-bold">
                      {formatCurrency(item.line_total)}
                    </p>
                  </div>
                ))}
              </div>
              <dl className="ml-auto mt-5 max-w-sm space-y-2 border-t border-zinc-100 pt-5 text-sm">
                <Summary
                  label="Ara toplam"
                  value={formatCurrency(order.subtotal)}
                />
                <Summary
                  label="İndirim"
                  value={`−${formatCurrency(order.discount_total)}`}
                />
                {campaigns.map((name) => (
                  <Summary key={name} label="Kampanya" value={name} />
                ))}
                {coupon ? <Summary label="Kupon" value={coupon} /> : null}
                <Summary
                  label="Kargo"
                  value={formatCurrency(order.shipping_total)}
                />
                <Summary label="KDV" value={formatCurrency(order.tax_total)} />
                <Summary
                  label="Genel toplam"
                  value={formatCurrency(order.grand_total)}
                  strong
                />
              </dl>
            </div>
          </AdminCard>
          <div className="grid gap-5 md:grid-cols-2">
            <AddressCard title="Teslimat adresi" address={delivery} />
            <AddressCard title="Fatura bilgileri" address={billing} />
          </div>
          <AdminCard>
            <AdminCardHeader
              title="Ödeme bilgileri"
              description="Sipariş anındaki ödeme talimatı"
            />
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-6">
              <Summary label="Ödeme yöntemi" value={paymentMethodLabel} />
              <Summary label="Ödeme durumu" value={order.payment_status} />
              <Summary
                label="Müşteri telefonu"
                value={phone || "Belirtilmedi"}
              />
              <Summary
                label="Beklenen ödeme"
                value={formatCurrency(order.expected_payment)}
              />
              <Summary
                label="Ödeme notu"
                value={order.payment_note ?? "Not bulunmuyor"}
              />
              <Summary
                label="IBAN"
                value={
                  paymentAccount && typeof paymentAccount.iban === "string"
                    ? paymentAccount.iban
                    : "Uygulanmıyor"
                }
              />
            </dl>
            {phoneHref ? (
              <div className="flex flex-wrap gap-3 border-t border-zinc-100 px-5 pb-5 pt-4 sm:px-6">
                <a href={`tel:${phoneHref}`} className={buttonVariants({ variant: "outline" })}>
                  <PhoneCall className="size-4" /> Ara
                </a>
                <a href={`https://wa.me/${phoneHref.replace(/^\+/, "")}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </div>
            ) : null}
          </AdminCard>
          <AdminCard>
            <AdminCardHeader
              title="Durum geçmişi"
              description="Sipariş zaman çizelgesi"
            />
            <ol className="space-y-0 p-5 sm:p-6">
              {history.map((entry, index) => (
                <li
                  key={`${entry.status}-${entry.at}`}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
                    <Clock3 className="size-4" />
                  </span>
                  {index < history.length - 1 ? (
                    <span className="absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5 bg-zinc-200" />
                  ) : null}
                  <div>
                    <p className="text-sm font-bold">{entry.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.at))}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </AdminCard>
        </div>
        <div className="space-y-5 xl:col-span-2">
          <AdminOrderShippingPreference order={detail.order} />
          <AdminOrderShipping detail={detail} />
        </div>
        <aside>
          <AdminCard className="sticky top-28">
            <AdminCardHeader
              title="Siparişi yönet"
              description="Durum, ödeme ve iç not"
            />
            <form onSubmit={submit} className="space-y-5 p-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Sipariş durumu
                </span>
                <select
                  name="status"
                  defaultValue={order.status}
                  className={adminControlClass}
                >
                  <option value="received">Sipariş alındı</option>
                  <option value="preparing">Hazırlanıyor</option>
                  <option value="shipped">Kargoya verildi</option>
                  <option value="delivered">Teslim edildi</option>
                  <option value="cancelled">İptal</option>
                </select>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm">
                <input
                  name="restoreStock"
                  type="checkbox"
                  className="mt-0.5 size-4 accent-red-600"
                />
                <span>
                  <strong className="block">Ürünleri stoğa geri ekle</strong>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Yalnızca iptal edilmiş ve daha önce stoktan düşülmüş
                    siparişlerde uygulanır.
                  </span>
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Ödeme durumu
                </span>
                <select
                  name="paymentStatus"
                  defaultValue={order.payment_status}
                  className={adminControlClass}
                >
                  <option value="pending">Bekliyor</option>
                  <option value="awaiting_payment">Ödeme bekleniyor</option>
                  <option value="awaiting_phone_approval">
                    Telefon ile onay bekleniyor
                  </option>
                  <option value="customer_unreachable">
                    Müşteriye ulaşılamadı
                  </option>
                  <option value="paid">Ödendi</option>
                  <option value="failed">Başarısız</option>
                  <option value="cancelled">İptal</option>
                  <option value="refunded">İade</option>
                </select>
              </label>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Button type="button" disabled={paymentAction !== null} onClick={() => void runPaymentAction("paid")}>Ödeme Alındı</Button>
                <Button type="button" variant="danger" disabled={paymentAction !== null} onClick={() => void runPaymentAction("rejected")}>Ödeme Reddedildi</Button>
                <Button type="button" variant="outline" disabled={paymentAction !== null} onClick={() => void runPaymentAction("unreachable")}>Müşteriye Ulaşılamadı</Button>
                <Button type="button" variant="outline" disabled={paymentAction !== null} onClick={() => void runPaymentAction("waiting")}>Ödeme Bekleniyor</Button>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Sipariş notu
                </span>
                <textarea
                  name="note"
                  defaultValue={order.admin_note ?? ""}
                  rows={5}
                  className={`${adminControlClass} h-auto py-3`}
                  placeholder="Yalnızca adminlerin göreceği not…"
                />
              </label>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
              </Button>
            </form>
          </AdminCard>
        </aside>
      </div>
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
      className={`flex justify-between gap-4 ${strong ? "pt-2 text-base font-black" : ""}`}
    >
      <dt className={strong ? "" : "text-zinc-500"}>{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
function AddressCard({
  title,
  address,
}: {
  title: string;
  address: Record<string, unknown>;
}) {
  return (
    <AdminCard className="p-5">
      <div className="flex gap-3">
        <MapPin className="size-5 shrink-0 text-red-600" />
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-2 text-sm font-semibold">
            {String(address.firstName ?? address.companyName ?? "")}{" "}
            {String(address.lastName ?? "")}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {String(
              address.address ??
                address.companyAddress ??
                "Teslimat adresi ile aynı",
            )}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {String(address.email ?? "")} {String(address.phone ?? "")}
          </p>
        </div>
      </div>
    </AdminCard>
  );
}
