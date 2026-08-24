import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/installment/server";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);
  const receipts = await context.service
    .from("installment_payment_receipts")
    .select("*")
    .is("superseded_at", null)
    .order("created_at", { ascending: false });
  if (receipts.error) return error("Dekontlar yüklenemedi.", 500);
  const applicationIds = [
    ...new Set(receipts.data.map((item) => item.application_id)),
  ];
  const applications = applicationIds.length
    ? await context.service
        .from("installment_applications")
        .select(
          "id,application_number,applicant_name,product_name_snapshot,variant_title_snapshot",
        )
        .in("id", applicationIds)
    : { data: [], error: null };
  if (applications.error) return error("Başvuru bilgileri yüklenemedi.", 500);
  const applicationMap = new Map(
    applications.data.map((application) => [application.id, application]),
  );
  const items = receipts.data.map((receipt) => {
    const application = applicationMap.get(receipt.application_id);
    return {
      ...receipt,
      applicationNumber: application?.application_number ?? "—",
      customerName: application?.applicant_name ?? "Müşteri",
      productName:
        application?.variant_title_snapshot ||
        application?.product_name_snapshot ||
        "—",
    };
  });
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
