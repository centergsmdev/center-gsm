import { createClient } from "@/lib/supabase/client";
import { ANALYTICS_SAFE_ERROR } from "./constants";
import { validateDateRange } from "./helpers";
import type { AnalyticsResult, DateRange } from "./types";
export async function refreshAnalytics(
  range: DateRange,
): Promise<AnalyticsResult<number>> {
  const db = createClient();
  if (!db) return { data: null, error: ANALYTICS_SAFE_ERROR };
  if (!validateDateRange(range))
    return { data: null, error: "Seçilen tarih aralığı geçersiz." };
  const [daily, products, customers] = await Promise.all([
    db.rpc("refresh_analytics_daily_metrics", {
      start_date: range.start,
      end_date: range.end,
    }),
    db.rpc("refresh_analytics_product_metrics", {
      start_date: range.start,
      end_date: range.end,
    }),
    db.rpc("refresh_analytics_customer_metrics", {
      start_date: range.start,
      end_date: range.end,
    }),
  ]);
  return daily.error || products.error || customers.error
    ? { data: null, error: "Veriler güncellenemedi." }
    : {
        data:
          Number(daily.data) + Number(products.data) + Number(customers.data),
        error: null,
      };
}
