import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/installment/server";
import { sameOriginRequest } from "@/lib/installment/server-security";
import {
  normalizeInstallmentCounts,
  validInstallmentCounts,
} from "@/lib/payment-plan/engine";
import { mapPaymentPlanConfig } from "@/lib/payment-plan/server";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);
  const result = await context.service
    .from("payment_plan_configurations")
    .select("*")
    .order("revision", { ascending: false });
  if (result.error) return error("Ödeme planı ayarları yüklenemedi.", 500);
  return NextResponse.json(
    { configurations: result.data.map(mapPaymentPlanConfig) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error("Ödeme planı ayarları okunamadı.");
  }
  const thresholdMinor = Number(body.thresholdMinor);
  const aboveBps = Number(body.aboveThresholdDownPaymentBps);
  const belowBps = Number(body.belowThresholdDownPaymentBps);
  const financeBps = Number(body.installmentFinanceChargeBps);
  const cardFinanceBps = Number(body.creditCardFinanceChargeBps);
  const installmentCounts = normalizeInstallmentCounts(body.installmentCounts);
  const cardCounts = normalizeInstallmentCounts(
    body.creditCardInstallmentCounts,
  );
  const rates = [aboveBps, belowBps, financeBps, cardFinanceBps];
  if (
    !Number.isSafeInteger(thresholdMinor) ||
    thresholdMinor < 0 ||
    thresholdMinor > 1_000_000_000_000 ||
    cardFinanceBps !== 0 ||
    rates.some(
      (rate) => !Number.isSafeInteger(rate) || rate < 0 || rate > 10_000,
    ) ||
    !installmentCounts ||
    !cardCounts ||
    !validInstallmentCounts(installmentCounts) ||
    !validInstallmentCounts(cardCounts)
  )
    return error("Ödeme planı değerlerini kontrol edin.");

  const result = await context.session.rpc(
    "admin_create_payment_plan_configuration",
    {
      p_threshold_minor: thresholdMinor,
      p_above_threshold_down_payment_bps: aboveBps,
      p_below_threshold_down_payment_bps: belowBps,
      p_installment_finance_charge_bps: financeBps,
      p_installment_counts: installmentCounts,
      p_credit_card_finance_charge_bps: cardFinanceBps,
      p_credit_card_installment_counts: cardCounts,
    },
  );
  if (result.error) {
    if (result.error.message.includes("invalid_payment_configuration"))
      return error("Ödeme planı değerlerini kontrol edin.");
    return error("Yeni ödeme planı revizyonu kaydedilemedi.", 500);
  }
  revalidatePath("/urun/[slug]", "page");
  revalidatePath("/elden-taksit/basvuru");
  return NextResponse.json({ configuration: result.data }, { status: 201 });
}
