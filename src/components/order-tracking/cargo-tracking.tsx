import { MapPin, PackageCheck, Truck } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { TrackedOrder } from "@/types/order-tracking";

export function CargoTracking({
  cargo,
  shipped,
}: {
  cargo: TrackedOrder["cargo"];
  shipped: boolean;
}) {
  return (
    <Card className="max-w-full overflow-hidden p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-primary">
          <Truck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black">Kargo Takibi</h2>
          <p className="mt-1 text-xs text-muted">
            Gönderinizin güncel hareketleri
          </p>
        </div>
      </div>
      <dl className="mt-4 grid gap-0 overflow-hidden rounded-lg bg-surface-subtle px-3 text-sm sm:mt-5 sm:grid-cols-3 sm:gap-3 sm:p-4">
        <Info label="Kargo firması" value={cargo.company} />
        <Info label="Takip numarası" value={cargo.trackingNumber} />
        <Info label="Tahmini teslimat" value={cargo.estimatedDelivery} />
        <Info label="Durum" value={cargo.status ?? "Hazırlanıyor"} />
      </dl>
      {cargo.trackingUrl ? (
        <a
          href={cargo.trackingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-bold text-red-600 underline"
        >
          Kargoyu takip et
        </a>
      ) : null}
      {shipped ? (
        <ol className="mt-6 space-y-5">
          {cargo.events.map((event, index) => (
            <li
              key={`${event.date}-${event.location}`}
              className="relative flex min-w-0 gap-3 sm:gap-4"
            >
              <span className="relative z-raised mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
                {index === 0 ? (
                  <PackageCheck className="size-3.5" aria-hidden="true" />
                ) : (
                  <MapPin className="size-3.5" aria-hidden="true" />
                )}
              </span>
              {index < cargo.events.length - 1 ? (
                <span
                  className="absolute left-[13px] top-8 h-[calc(100%+4px)] w-px bg-border"
                  aria-hidden="true"
                />
              ) : null}
              <div className="min-w-0 pt-0.5">
                <p className="break-words text-sm font-bold">
                  {event.description}
                </p>
                <p className="mt-1 break-words text-xs text-muted">
                  {event.location} · {event.date}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-md bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          Siparişiniz kargoya verildiğinde takip hareketleri burada
          görüntülenecek.
        </p>
      )}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border py-3 last:border-b-0 sm:border-0 sm:py-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-all text-xs font-black sm:break-words">
        {value}
      </dd>
    </div>
  );
}
