"use client";

import { AlertTriangle, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  portalPaymentTimeRemaining,
  type PortalPaymentTimeRemaining,
} from "@/lib/installment/customer-portal-deadline";

export function PortalPaymentCountdown({
  paymentDueAt,
  formattedDueAt,
}: {
  paymentDueAt: string;
  formattedDueAt: string;
}) {
  const router = useRouter();
  const refreshStarted = useRef(false);
  const [remaining, setRemaining] = useState<PortalPaymentTimeRemaining | null>(
    null,
  );

  useEffect(() => {
    function update() {
      const next = portalPaymentTimeRemaining(paymentDueAt);
      setRemaining(next);
      if (next.expired && !refreshStarted.current) {
        refreshStarted.current = true;
        router.refresh();
      }
    }
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [paymentDueAt, router]);

  const urgent = (remaining?.totalSeconds ?? Number.POSITIVE_INFINITY) <= 3_600;

  return (
    <div
      className={`mt-5 overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5 ${
        urgent
          ? "border-red-300 bg-red-50 text-red-950"
          : "border-blue-200 bg-blue-50 text-blue-950"
      }`}
    >
      <div className="flex items-center gap-2">
        {urgent ? (
          <AlertTriangle
            className="size-5 animate-pulse text-red-600"
            aria-hidden="true"
          />
        ) : (
          <Clock3 className="size-5 text-blue-700" aria-hidden="true" />
        )}
        <p className="text-xs font-black uppercase tracking-[0.16em]">
          Ödeme için kalan süre
        </p>
      </div>

      {remaining ? (
        remaining.expired ? (
          <p className="mt-3 text-base font-black">
            Süre doldu · İşlem durumu güncelleniyor…
          </p>
        ) : (
          <div
            role="timer"
            aria-label={`Ödeme için ${remaining.days} gün ${remaining.hours} saat ${remaining.minutes} dakika ${remaining.seconds} saniye kaldı`}
            className="mt-3 grid grid-cols-4 gap-2"
          >
            <TimePart value={remaining.days} label="Gün" />
            <TimePart value={remaining.hours} label="Saat" />
            <TimePart value={remaining.minutes} label="Dakika" />
            <TimePart value={remaining.seconds} label="Saniye" />
          </div>
        )
      ) : (
        <p className="mt-3 text-sm font-bold">Geri sayım hazırlanıyor…</p>
      )}

      <p className="mt-3 text-xs font-bold opacity-75">
        Son ödeme zamanı: {formattedDueAt}
      </p>
    </div>
  );
}

function TimePart({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-xl bg-white px-2 py-3 text-center shadow-sm">
      <strong className="block text-xl font-black tabular-nums sm:text-2xl">
        {String(value).padStart(2, "0")}
      </strong>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-wider opacity-65">
        {label}
      </span>
    </span>
  );
}
