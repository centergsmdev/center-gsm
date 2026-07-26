import { ANALYTICS_MAX_DAYS } from "./constants";
import type { DateRange, DistributionItem } from "./types";
export function validateDateRange(range: DateRange) {
  const start = new Date(`${range.start}T00:00:00Z`),
    end = new Date(`${range.end}T00:00:00Z`);
  return (
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    start <= end &&
    (end.getTime() - start.getTime()) / 86400000 <= ANALYTICS_MAX_DAYS
  );
}
export function formatAnalyticsCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(Math.round(value * 100) / 100);
}
export function formatAnalyticsPercent(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / 100);
}
export function aggregateDistribution(values: string[]): DistributionItem[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
export function presetRange(preset: string): DateRange {
  const today = new Date();
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  let start = new Date(end);
  if (preset === "yesterday") {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setUTCDate(end.getUTCDate() - 1);
  } else if (preset === "7d") start.setUTCDate(start.getUTCDate() - 6);
  else if (preset === "30d") start.setUTCDate(start.getUTCDate() - 29);
  else if (preset === "month")
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  else if (preset === "last-month") {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
    end.setUTCDate(0);
  }
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}
