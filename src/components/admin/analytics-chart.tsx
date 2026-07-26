"use client";
import type { DailyMetric } from "@/lib/analytics";
export function AnalyticsChart({
  rows,
  metric,
  title,
  description,
}: {
  rows: DailyMetric[];
  metric:
    | "gross_revenue"
    | "net_revenue"
    | "order_count"
    | "average_order_value"
    | "new_customer_count";
  title: string;
  description: string;
}) {
  const max = Math.max(...rows.map((row) => Number(row[metric])), 1);
  return (
    <figure
      aria-labelledby={`${metric}-title`}
      className="rounded-2xl border bg-white p-5"
    >
      <figcaption>
        <h3 id={`${metric}-title`} className="font-bold">
          {title}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </figcaption>
      <div
        className="mt-5 flex h-48 items-end gap-1"
        role="img"
        aria-label={`${title} çubuk grafiği`}
      >
        {rows.map((row) => {
          const value = Number(row[metric]);
          return (
            <div
              key={row.metric_date}
              className="group relative flex min-w-1 flex-1 items-end"
              style={{ height: "100%" }}
            >
              <span
                className="w-full rounded-t bg-red-600/80"
                style={{
                  height: `${Math.max((value / max) * 100, value ? 3 : 0)}%`,
                }}
              />
              <span className="sr-only">
                {row.metric_date}: {value}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
