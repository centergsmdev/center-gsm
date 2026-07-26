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
    <Card className="p-5 sm:p-6">
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
      <dl className="mt-5 grid gap-3 rounded-lg bg-surface-subtle p-4 text-sm sm:grid-cols-3">
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
              className="relative flex gap-4"
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
              <div>
                <p className="text-sm font-bold">{event.description}</p>
                <p className="mt-1 text-xs text-muted">
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
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words text-xs font-black">{value}</dd>
    </div>
  );
}
