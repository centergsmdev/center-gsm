export const CUSTOMER_SATISFACTION_PAGE_SIZE = 12;
export const CUSTOMER_SATISFACTION_MAX_PAGE = 100;

export type CustomerSatisfactionSort = "newest" | "highest" | "lowest";
export type CustomerSatisfactionFilter = "all" | "photos" | "verified";

export type CustomerSatisfactionQuery = {
  page: number;
  rating: number | null;
  filter: CustomerSatisfactionFilter;
  sort: CustomerSatisfactionSort;
  search: string;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCustomerSatisfactionQuery(
  params: RawSearchParams,
): CustomerSatisfactionQuery {
  const rawPage = Number.parseInt(first(params.page) ?? "1", 10);
  const rawRating = Number.parseInt(first(params.rating) ?? "", 10);
  const rawFilter = first(params.filter);
  const rawSort = first(params.sort);
  return {
    page: Math.min(
      CUSTOMER_SATISFACTION_MAX_PAGE,
      Math.max(1, Number.isFinite(rawPage) ? rawPage : 1),
    ),
    rating:
      Number.isFinite(rawRating) && rawRating >= 1 && rawRating <= 5
        ? rawRating
        : null,
    filter:
      rawFilter === "photos" || rawFilter === "verified" ? rawFilter : "all",
    sort: rawSort === "highest" || rawSort === "lowest" ? rawSort : "newest",
    search: (first(params.search) ?? "").trim().slice(0, 80),
  };
}

export function privacySafeReviewName(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  if (
    !normalized ||
    normalized.includes("@") ||
    /(?:\+?90|0)?\s*\d(?:[\s().-]*\d){8,}/.test(normalized)
  )
    return "CENTER GSM Müşterisi";

  const parts = normalized.split(" ");
  if (parts.length < 2) return normalized.slice(0, 30);
  const firstName = parts[0].slice(0, 24);
  const lastPart = parts.at(-1) ?? "";
  const initial = lastPart.replace(/[^\p{L}]/gu, "").charAt(0);
  return initial
    ? `${firstName} ${initial.toLocaleUpperCase("tr-TR")}.`
    : firstName;
}

export function ratingPercentage(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, count) / total) * 100);
}

export function customerSatisfactionPageCount(total: number) {
  return Math.max(
    1,
    Math.ceil(Math.max(0, total) / CUSTOMER_SATISFACTION_PAGE_SIZE),
  );
}

export function withCustomerSatisfactionQuery(
  query: CustomerSatisfactionQuery,
  updates: Partial<CustomerSatisfactionQuery>,
) {
  const next = { ...query, ...updates };
  const params = new URLSearchParams();
  if (next.page > 1) params.set("page", String(next.page));
  if (next.rating) params.set("rating", String(next.rating));
  if (next.filter !== "all") params.set("filter", next.filter);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.search) params.set("search", next.search);
  const value = params.toString();
  return value ? `/musteri-memnuniyeti?${value}` : "/musteri-memnuniyeti";
}
