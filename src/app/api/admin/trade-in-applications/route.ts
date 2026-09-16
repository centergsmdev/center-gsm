import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await requireAdmin();
  if (context.error) return context.error;
  const result = await context.service
    .from("trade_in_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (result.error)
    return NextResponse.json(
      { data: null, error: "Başvurular yüklenemedi." },
      { status: 500 },
    );
  return NextResponse.json({ data: result.data, error: null });
}
