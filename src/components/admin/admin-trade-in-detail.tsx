"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  LoaderCircle,
  MessageCircle,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import {
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildWhatsAppHref } from "@/lib/contact/whatsapp";
import { formatMinorCurrency } from "@/lib/payment-plan/engine";
import {
  BODY_CONDITION_LABELS,
  REPAIR_STATUS_LABELS,
  SCREEN_CONDITION_LABELS,
  TRADE_IN_STATUS_LABELS,
} from "@/lib/trade-in/constants";
import { cn } from "@/lib/utils";
import type {
  TradeInApplicationRow,
  TradeInPhotoRow,
  TradeInStatus,
} from "@/types/database";

type Detail = {
  application: TradeInApplicationRow;
  photos: Array<TradeInPhotoRow & { url: string | null }>;
};

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold text-zinc-900">
        {value || "—"}
      </dd>
    </div>
  );
}

export function AdminTradeInDetail({
  applicationId,
}: {
  applicationId: string;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<TradeInStatus>("new");
  const [offer, setOffer] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const response = await fetch(
        `/api/admin/trade-in-applications/${applicationId}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as { data?: Detail | null };
      if (!response.ok || !result.data) throw new Error("load_failed");
      setDetail(result.data);
      setStatus(result.data.application.status);
      setOffer(
        result.data.application.offer_amount_minor === null
          ? ""
          : String(result.data.application.offer_amount_minor / 100),
      );
      setCustomerNote(result.data.application.customer_response_note ?? "");
      setInternalNote(result.data.application.internal_note ?? "");
    } catch {
      setFailed(true);
    }
  }, [applicationId]);

  useEffect(() => void load(), [load]);

  const whatsappHref = useMemo(() => {
    if (!detail) return null;
    const amount =
      offer && Number(offer) >= 0
        ? ` Ön değerlendirme teklifimiz: ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(offer))}.`
        : "";
    return buildWhatsAppHref(
      detail.application.phone_e164,
      `Merhaba ${detail.application.customer_name}, ${detail.application.application_number} numaralı ${detail.application.device_brand} ${detail.application.device_model} takas başvurunuz incelendi.${amount}${customerNote ? ` ${customerNote}` : ""} Kesin teklif cihazın fiziksel kontrolünden sonra netleşir.`,
    );
  }, [customerNote, detail, offer]);

  async function save() {
    const numericOffer = offer.trim() ? Number(offer.replace(",", ".")) : null;
    if (
      numericOffer !== null &&
      (!Number.isFinite(numericOffer) || numericOffer < 0)
    ) {
      setNotice("Geçerli bir teklif tutarı girin.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/trade-in-applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            offerAmountMinor:
              numericOffer === null ? null : Math.round(numericOffer * 100),
            customerResponseNote: customerNote,
            internalNote,
          }),
        },
      );
      const result = (await response.json()) as { error?: string | null };
      if (!response.ok)
        throw new Error(result.error || "Güncelleme yapılamadı.");
      setNotice("Başvuru güncellendi.");
      await load();
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Güncelleme yapılamadı.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (failed) return <AdminErrorState retry={() => void load()} />;
  if (!detail) return <AdminLoadingState />;
  const item = detail.application;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/telefon-takas"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" />
          Başvurulara dön
        </Link>
        <AdminBadge
          variant={
            status === "completed" || status === "accepted"
              ? "success"
              : status === "rejected" || status === "cancelled"
                ? "danger"
                : "warning"
          }
        >
          {TRADE_IN_STATUS_LABELS[status]}
        </AdminBadge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <AdminCard>
            <AdminCardHeader
              title={`${item.device_brand} ${item.device_model}`}
              description={`${item.application_number} · ${item.customer_name}`}
            />
            <dl className="px-5 pb-3 sm:px-6">
              <DataRow label="Depolama" value={item.storage_capacity} />
              <DataRow
                label="Ekran"
                value={SCREEN_CONDITION_LABELS[item.screen_condition]}
              />
              <DataRow
                label="Kasa"
                value={BODY_CONDITION_LABELS[item.body_condition]}
              />
              <DataRow
                label="Cihaz"
                value={item.powers_on ? "Açılıyor" : "Açılmıyor"}
              />
              <DataRow
                label="Onarım"
                value={REPAIR_STATUS_LABELS[item.repair_status]}
              />
              <DataRow
                label="Pil sağlığı"
                value={item.battery_health ? `%${item.battery_health}` : null}
              />
              <DataRow label="Kutu" value={item.has_box ? "Mevcut" : "Yok"} />
              <DataRow label="İstenen ürün" value={item.desired_product} />
              <DataRow label="Müşteri notu" value={item.customer_note} />
            </dl>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader
              title="Cihaz fotoğrafları"
              description="Fotoğraflar private alandan 10 dakikalık güvenli bağlantıyla gösterilir."
            />
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
              {detail.photos.map((photo, index) =>
                photo.url ? (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
                  >
                    <Image
                      src={photo.url}
                      alt={`Takas cihaz fotoğrafı ${index + 1}`}
                      fill
                      unoptimized
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="180px"
                    />
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-zinc-950/80 px-2 py-1 text-[10px] font-bold text-white">
                      Fotoğraf {index + 1}
                      <ExternalLink className="size-3" />
                    </span>
                  </a>
                ) : null,
              )}
            </div>
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard>
            <AdminCardHeader
              title="Değerlendirme"
              description="Teklifi ve müşteriye gösterilecek notu yönetin."
            />
            <div className="space-y-4 p-5 sm:p-6">
              <label className="block space-y-2">
                <span className="text-sm font-bold">Durum</span>
                <select
                  className={adminControlClass}
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TradeInStatus)
                  }
                >
                  {Object.entries(TRADE_IN_STATUS_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold">
                  Ön değerlendirme teklifi (TL)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={adminControlClass}
                  value={offer}
                  onChange={(event) => setOffer(event.target.value)}
                  placeholder="Örn. 25000"
                />
                {item.offer_amount_minor !== null ? (
                  <span className="text-xs text-zinc-500">
                    Kayıtlı tutar:{" "}
                    {formatMinorCurrency(item.offer_amount_minor)}
                  </span>
                ) : null}
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold">
                  Müşteriye iletilecek not
                </span>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-zinc-200 p-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  value={customerNote}
                  onChange={(event) => setCustomerNote(event.target.value)}
                  maxLength={1000}
                  placeholder="Örn. Teklifimiz cihazın mağaza kontrolü sonrası kesinleşecektir."
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold">Dahili not</span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  maxLength={2000}
                  placeholder="Yalnızca yöneticiler görür."
                />
              </label>
              {notice ? (
                <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700">
                  {notice}
                </p>
              ) : null}
              <Button
                className="w-full"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Değişiklikleri Kaydet
              </Button>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "w-full",
                  )}
                >
                  <MessageCircle className="size-4" />
                  WhatsApp&apos;tan İlet
                </a>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader title="Müşteri" />
            <dl className="px-5 pb-3 sm:px-6">
              <DataRow label="Ad soyad" value={item.customer_name} />
              <DataRow label="Telefon" value={item.phone_e164} />
              <DataRow
                label="Başvuru tarihi"
                value={new Intl.DateTimeFormat("tr-TR", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(item.created_at))}
              />
            </dl>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
