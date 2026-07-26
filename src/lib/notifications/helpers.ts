import type { Json } from "@/types/database";
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    String(variables[key] ?? `{{${key}}}`),
  );
}
export function jsonVariables(
  value: Json,
): Record<string, string | number | null | undefined> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  const output: Record<string, string | number | null | undefined> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || item === null)
      output[key] = item;
  }
  return output;
}
export function formatNotificationDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
