import type { Json } from "@/types/database";

export function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAuditJson(value: Json | null): string {
  return value === null ? "—" : JSON.stringify(value, null, 2);
}

export function summarizeUserAgent(value: string | null): string {
  if (!value) return "—";
  if (value.includes("Edg/")) return "Microsoft Edge";
  if (value.includes("Chrome/")) return "Google Chrome";
  if (value.includes("Firefox/")) return "Mozilla Firefox";
  if (value.includes("Safari/")) return "Safari";
  return value.slice(0, 80);
}
