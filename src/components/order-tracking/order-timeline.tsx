import { Check } from "lucide-react";

import type {
  OrderStage,
  OrderTimelineItem,
} from "@/types/order-tracking";

const formatTimelineDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : null;

export function OrderTimeline({
  currentStage,
  timeline,
}: {
  currentStage: OrderStage;
  timeline: OrderTimelineItem[];
}) {
  if (currentStage === "cancelled") {
    return (
      <section aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="text-lg font-black">
          Sipariş Durumu
        </h2>
        <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">
          Sipariş iptal edildi.
        </p>
      </section>
    );
  }
  const currentIndex = timeline.findIndex(
    (item) => item.stage === currentStage,
  );
  return (
    <section aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="text-lg font-black">
        Sipariş Durumu
      </h2>
      <ol className="mt-5 grid min-w-0 gap-0 sm:mt-6 sm:grid-cols-5">
        {timeline.map((item, index) => {
          const complete = index <= currentIndex;
          const current = index === currentIndex;
          return (
            <li
              key={item.stage}
              className="relative flex gap-4 pb-7 last:pb-0 sm:block sm:pb-0 sm:text-center"
            >
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5 sm:left-1/2 sm:top-4 sm:h-0.5 sm:w-full ${index < currentIndex ? "bg-success" : "bg-border"} ${index === timeline.length - 1 ? "hidden" : ""}`}
              />
              <span
                className={`relative z-raised grid size-8 shrink-0 place-items-center rounded-full border-2 sm:mx-auto ${complete ? "border-success bg-success text-white" : "border-border bg-white text-muted"}`}
              >
                {complete ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  <span className="size-2 rounded-full bg-current" />
                )}
              </span>
              <div className="min-w-0 pt-0.5 sm:mt-3">
                <p
                  className={`break-words text-xs font-black ${current ? "text-success" : complete ? "text-foreground" : "text-muted"}`}
                >
                  {item.label}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  {formatTimelineDate(item.at) ??
                    (complete ? "Tamamlandı" : "Bekleniyor")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
