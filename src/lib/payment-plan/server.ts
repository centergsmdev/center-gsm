import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  calculatePaymentPlan,
  liraToMinor,
  validatePaymentPlanConfig,
  type PaymentPlan,
  type PaymentPlanConfig,
} from "./engine";
import {
  createPaymentPlanOfferToken,
  verifyPaymentPlanOfferToken,
} from "./security";
import type { PaymentPlanOffer } from "./types";
import type {
  Database,
  PaymentPlanConfigurationRow,
} from "../../types/database";
import type { InstallmentProductSummary } from "../installment/types";

export type PaymentPlanSnapshotInsert = {
  application_id: string;
  payment_type: "installment_application";
  payment_config_id: string;
  payment_config_revision: number;
  product_price_minor: number;
  threshold_minor: number;
  down_payment_rate_bps: number;
  down_payment_amount_minor: number;
  remaining_principal_minor: number;
  finance_charge_rate_bps: number;
  finance_charge_amount_minor: number;
  financed_total_minor: number;
  installment_count: number;
  installment_schedule: Array<{ installment: number; amount_minor: number }>;
  total_payable_minor: number;
};

export function mapPaymentPlanConfig(
  row: PaymentPlanConfigurationRow,
): PaymentPlanConfig {
  return {
    id: row.id,
    revision: row.revision,
    thresholdMinor: Number(row.threshold_minor),
    aboveThresholdDownPaymentBps: row.above_threshold_down_payment_bps,
    belowThresholdDownPaymentBps: row.below_threshold_down_payment_bps,
    installmentFinanceChargeBps: row.installment_finance_charge_bps,
    installmentCounts: row.installment_counts,
    creditCardFinanceChargeBps: row.credit_card_finance_charge_bps,
    creditCardInstallmentCounts: row.credit_card_installment_counts,
    createdAt: row.created_at,
  };
}

export async function getActivePaymentPlanConfig(
  service: SupabaseClient<Database>,
) {
  const result = await service
    .from("payment_plan_configurations")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const config = mapPaymentPlanConfig(result.data);
  return validatePaymentPlanConfig(config) ? config : null;
}

export async function getPaymentPlanOffer(
  service: SupabaseClient<Database>,
  product: InstallmentProductSummary,
  installmentCount: number,
  secret: string,
): Promise<PaymentPlanOffer | null> {
  const config = await getActivePaymentPlanConfig(service);
  if (!config || !secret) return null;
  const count = config.installmentCounts.includes(installmentCount)
    ? installmentCount
    : (config.installmentCounts.at(-1) ?? 0);
  if (!count) return null;
  const productPriceMinor = liraToMinor(product.price);
  const plan = calculatePaymentPlan({
    paymentType: "installment_application",
    productPriceMinor,
    installmentCount: count,
    config,
  });
  const presentedAt = new Date().toISOString();
  return {
    config,
    plan,
    presentedAt,
    offerToken: createPaymentPlanOfferToken(
      {
        configId: config.id,
        configRevision: config.revision,
        productId: product.productId,
        variantId: product.variantId,
        productPriceMinor,
        presentedAt,
      },
      secret,
    ),
  };
}

export async function resolvePaymentPlanSnapshot(
  service: SupabaseClient<Database>,
  input: {
    applicationId: string;
    offerToken: string;
    installmentCount: number;
    product: InstallmentProductSummary;
  },
  secret: string,
): Promise<
  | { data: PaymentPlanSnapshotInsert; plan: PaymentPlan; error: null }
  | { data: null; plan: null; error: string }
> {
  const offer = verifyPaymentPlanOfferToken(
    input.offerToken,
    { productId: input.product.productId, variantId: input.product.variantId },
    secret,
  );
  if (!offer)
    return { data: null, plan: null, error: "Ödeme planı doğrulanamadı." };
  const currentPriceMinor = liraToMinor(input.product.price);
  if (offer.productPriceMinor !== currentPriceMinor)
    return {
      data: null,
      plan: null,
      error: "Ürün fiyatı değişti. Lütfen başvuru sayfasını yenileyin.",
    };
  const [configResult, activeResult] = await Promise.all([
    service
      .from("payment_plan_configurations")
      .select("*")
      .eq("id", offer.configId)
      .eq("revision", offer.configRevision)
      .maybeSingle(),
    service
      .from("payment_plan_configurations")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);
  if (
    configResult.error ||
    activeResult.error ||
    !configResult.data ||
    !activeResult.data
  )
    return {
      data: null,
      plan: null,
      error: "Ödeme planı şu anda kullanılamıyor. Lütfen daha sonra deneyin.",
    };
  const config = mapPaymentPlanConfig(configResult.data);
  if (
    !validatePaymentPlanConfig(config) ||
    !config.installmentCounts.includes(input.installmentCount)
  )
    return {
      data: null,
      plan: null,
      error: "Seçilen taksit sayısı artık kullanılamıyor.",
    };
  const plan = calculatePaymentPlan({
    paymentType: "installment_application",
    productPriceMinor: currentPriceMinor,
    installmentCount: input.installmentCount,
    config,
  });
  return {
    data: {
      application_id: input.applicationId,
      payment_type: "installment_application",
      payment_config_id: plan.configId,
      payment_config_revision: plan.configRevision,
      product_price_minor: plan.productPriceMinor,
      threshold_minor: plan.thresholdMinor,
      down_payment_rate_bps: plan.downPaymentRateBps,
      down_payment_amount_minor: plan.downPaymentAmountMinor,
      remaining_principal_minor: plan.remainingPrincipalMinor,
      finance_charge_rate_bps: plan.financeChargeRateBps,
      finance_charge_amount_minor: plan.financeChargeAmountMinor,
      financed_total_minor: plan.financedTotalMinor,
      installment_count: plan.installmentCount,
      installment_schedule: plan.installmentSchedule.map((item) => ({
        installment: item.installment,
        amount_minor: item.amountMinor,
      })),
      total_payable_minor: plan.totalPayableMinor,
    },
    plan,
    error: null,
  };
}
