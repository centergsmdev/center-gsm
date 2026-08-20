import { NextResponse } from "next/server";

import { getAdminContext, mapAdminApplication } from "@/lib/installment/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { error: "Admin yetkisi gerekiyor." },
      { status: 403 },
    );
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .slice(0, 100);
  const status = url.searchParams.get("status") ?? "pending";
  const result = await context.service
    .from("installment_applications")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(500);
  if (result.error)
    return NextResponse.json(
      { error: "Başvurular yüklenemedi." },
      { status: 500 },
    );
  const rows = result.data.filter((row) => {
    const statusMatches =
      status === "all" ||
      (status === "pending" &&
        (row.status === "submitted" || row.status === "under_review")) ||
      row.status === status;
    if (!statusMatches) return false;
    if (!query) return true;
    return `${row.application_number} ${row.applicant_name} ${row.phone_e164}`
      .toLocaleLowerCase("tr-TR")
      .includes(query);
  });
  return NextResponse.json(
    { items: rows.map(mapAdminApplication) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
