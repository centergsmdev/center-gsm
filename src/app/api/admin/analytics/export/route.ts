import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authApi } from "@/lib/supabase/auth-api";
import { ANALYTICS_EXPORT_LIMIT, validateDateRange } from "@/lib/analytics";
import type { DateRange } from "@/lib/analytics";
const reports = ["sales", "products", "customers", "orders", "stock"] as const;
type Report = (typeof reports)[number];
const safeCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export async function GET(request: Request) {
  const db = await createClient();
  if (!db)
    return NextResponse.json(
      { error: "Rapor oluşturulamadı." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  const url = new URL(request.url),
    report = url.searchParams.get("report") as Report | null,
    start =
      url.searchParams.get("start") ?? new Date().toISOString().slice(0, 10),
    end = url.searchParams.get("end") ?? start,
    range: DateRange = { start, end };
  if (
    !report ||
    !reports.includes(report) ||
    (report !== "stock" && !validateDateRange(range))
  )
    return NextResponse.json(
      { error: "Seçilen tarih aralığı geçersiz." },
      { status: 400 },
    );
  let rows: string[][] = [];
  if (report === "sales") {
    const result = await db
      .from("analytics_daily_metrics")
      .select("*")
      .gte("metric_date", start)
      .lte("metric_date", end)
      .order("metric_date")
      .limit(ANALYTICS_EXPORT_LIMIT);
    if (result.error)
      return NextResponse.json(
        { error: "Rapor oluşturulamadı." },
        { status: 500 },
      );
    rows = [
      [
        "Tarih",
        "Brüt Gelir",
        "Net Gelir",
        "İndirim",
        "İade",
        "Sipariş",
        "Tamamlanan",
        "İptal",
        "Ortalama Sepet",
        "Satılan Ürün",
      ],
      ...result.data.map((x) => [
        x.metric_date,
        String(x.gross_revenue),
        String(x.net_revenue),
        String(x.discount_total),
        String(x.refund_total),
        String(x.order_count),
        String(x.completed_order_count),
        String(x.cancelled_order_count),
        String(x.average_order_value),
        String(x.items_sold),
      ]),
    ];
  } else if (report === "products") {
    const result = await db
      .from("analytics_product_metrics")
      .select("*")
      .gte("metric_date", start)
      .lte("metric_date", end)
      .order("net_revenue", { ascending: false })
      .limit(ANALYTICS_EXPORT_LIMIT);
    if (result.error)
      return NextResponse.json(
        { error: "Rapor oluşturulamadı." },
        { status: 500 },
      );
    rows = [
      [
        "Tarih",
        "Ürün",
        "SKU",
        "Marka",
        "Adet",
        "Sipariş",
        "Brüt",
        "Net",
        "İndirim",
        "İade",
      ],
      ...result.data.map((x) => [
        x.metric_date,
        x.product_name,
        x.sku,
        x.brand_name ?? "",
        String(x.units_sold),
        String(x.order_count),
        String(x.gross_revenue),
        String(x.net_revenue),
        String(x.discount_total),
        String(x.refund_total),
      ]),
    ];
  } else if (report === "customers") {
    const result = await db
      .from("analytics_customer_metrics")
      .select("*")
      .gte("metric_date", start)
      .lte("metric_date", end)
      .order("revenue", { ascending: false })
      .limit(ANALYTICS_EXPORT_LIMIT);
    if (result.error)
      return NextResponse.json(
        { error: "Rapor oluşturulamadı." },
        { status: 500 },
      );
    rows = [
      [
        "Tarih",
        "Müşteri ID",
        "Sipariş",
        "Gelir",
        "Ürün",
        "İade",
        "İlk Sipariş",
        "Son Sipariş",
        "Tekrar",
      ],
      ...result.data.map((x) => [
        x.metric_date,
        x.customer_id ?? "Misafir",
        String(x.order_count),
        String(x.revenue),
        String(x.items_purchased),
        String(x.refund_total),
        x.first_order_at ?? "",
        x.last_order_at ?? "",
        x.is_repeat_customer ? "Evet" : "Hayır",
      ]),
    ];
  } else if (report === "orders") {
    const result = await db
      .from("orders")
      .select(
        "id,order_number,status,payment_status,fulfillment_status,payment_method,grand_total,created_at",
      )
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`)
      .limit(ANALYTICS_EXPORT_LIMIT);
    if (result.error)
      return NextResponse.json(
        { error: "Rapor oluşturulamadı." },
        { status: 500 },
      );
    rows = [
      ["Sipariş", "Durum", "Ödeme", "Teslimat", "Yöntem", "Toplam", "Tarih"],
      ...result.data.map((x) => [
        x.order_number,
        x.status,
        x.payment_status,
        x.fulfillment_status,
        x.payment_method,
        String(x.grand_total),
        x.created_at,
      ]),
    ];
  } else {
    const result = await db
      .from("inventory")
      .select("*")
      .limit(ANALYTICS_EXPORT_LIMIT);
    if (result.error)
      return NextResponse.json(
        { error: "Rapor oluşturulamadı." },
        { status: 500 },
      );
    rows = [
      [
        "Ürün ID",
        "Depo ID",
        "Fiziksel",
        "Rezerve",
        "Kullanılabilir",
        "Kritik Seviye",
      ],
      ...result.data.map((x) => [
        x.product_id,
        x.warehouse_id,
        String(x.quantity_on_hand),
        String(x.quantity_reserved),
        String(x.quantity_on_hand - x.quantity_reserved),
        String(x.reorder_level),
      ]),
    ];
  }
  if (rows.length <= 1)
    return NextResponse.json(
      { error: "Bu rapor için veri bulunamadı." },
      { status: 404 },
    );
  await db.rpc("write_audit_log", {
    p_action: "analytics_exported",
    p_entity_type: "system",
    p_entity_name: "Analytics CSV",
    p_metadata: {
      start_date: start,
      end_date: end,
      report_type: report,
      row_count: rows.length - 1,
    },
  });
  const csv =
    "\uFEFF" + rows.map((row) => row.map(safeCell).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="center-gsm-${report}-${start}-${end}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
