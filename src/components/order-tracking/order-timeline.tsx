import { Check } from "lucide-react";

import type { OrderStage } from "@/types/order-tracking";

const stages: { key: OrderStage; label: string; description: string }[] = [
  {
    key: "received",
    label: "Sipariş alındı",
    description: "24 Temmuz · 14:32",
  },
  { key: "paid", label: "Ödeme onaylandı", description: "24 Temmuz · 14:34" },
  { key: "preparing", label: "Hazırlanıyor", description: "25 Temmuz · 09:10" },
  {
    key: "shipped",
    label: "Kargoya verildi",
    description: "26 Temmuz · 18:40",
  },
  { key: "delivered", label: "Teslim edildi", description: "Bekleniyor" },
];

export function OrderTimeline({ currentStage }: { currentStage: OrderStage }) {
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
  const currentIndex = stages.findIndex((stage) => stage.key === currentStage);
  return (
    <section aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="text-lg font-black">
        Sipariş Durumu
      </h2>
      <ol className="mt-5 grid min-w-0 gap-0 sm:mt-6 sm:grid-cols-5">
        {stages.map((stage, index) => {
          const complete = index <= currentIndex;
          const current = index === currentIndex;
          return (
            <li
              key={stage.key}
              className="relative flex gap-4 pb-7 last:pb-0 sm:block sm:pb-0 sm:text-center"
            >
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5 sm:left-1/2 sm:top-4 sm:h-0.5 sm:w-full ${index < currentIndex ? "bg-success" : "bg-border"} ${index === stages.length - 1 ? "hidden" : ""}`}
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
                  {stage.label}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  {currentStage === "received" && index > 0
                    ? "Bekleniyor"
                    : stage.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
