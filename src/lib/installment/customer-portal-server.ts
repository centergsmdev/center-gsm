import "server-only";

import { getInstallmentHashSecret, getInstallmentServiceClient } from "./server";
import { verifyPortalAccessToken } from "./customer-portal-security";
import type {
  InstallmentAdminPaymentPlan,
  InstallmentPortalPaymentSnapshot,
  InstallmentPortalStage,
} from "./types";

export type InstallmentCustomerPortalData = {
  portalId: string;
  applicationNumber: string;
  applicantName: string;
  productName: string;
  variantTitle: string | null;
  sku: string;
  imageUrl: string | null;
  color: string | null;
  storageValue: number | null;
  storageUnit: "GB" | "TB" | null;
  stage: InstallmentPortalStage;
  publicNote: string | null;
  paymentDueAt: string | null;
  updatedAt: string;
  paymentAccount: InstallmentPortalPaymentSnapshot;
  paymentPlan: InstallmentAdminPaymentPlan;
};

export async function getCustomerPortalData(
  portalId: string,
  accessToken: string | null,
): Promise<InstallmentCustomerPortalData | null> {
  const service = getInstallmentServiceClient();
  const secret = getInstallmentHashSecret();
  if (!service || !secret || !accessToken) return null;
  const portal = await service
    .from("installment_customer_portals")
    .select("*")
    .eq("id", portalId)
    .maybeSingle();
  if (
    portal.error ||
    !portal.data ||
    !verifyPortalAccessToken(
      accessToken,
      {
        portalId: portal.data.id,
        accessVersion: portal.data.access_version,
        accessExpiresAt: portal.data.access_expires_at,
      },
      secret,
    )
  )
    return null;
  const [application, paymentPlan] = await Promise.all([
    service
      .from("installment_applications")
      .select("*")
      .eq("id", portal.data.application_id)
      .eq("status", "approved")
      .maybeSingle(),
    service
      .from("installment_application_payment_plans")
      .select("*")
      .eq("application_id", portal.data.application_id)
      .maybeSingle(),
  ]);
  if (
    application.error ||
    paymentPlan.error ||
    !application.data ||
    !paymentPlan.data
  )
    return null;
  const app = application.data;
  const plan = paymentPlan.data;
  const account = portal.data.payment_account_snapshot;
  return {
    portalId: portal.data.id,
    applicationNumber: app.application_number,
    applicantName: app.applicant_name,
    productName: app.product_name_snapshot,
    variantTitle: app.variant_title_snapshot,
    sku: app.sku_snapshot,
    imageUrl: app.image_url_snapshot,
    color: app.color_snapshot,
    storageValue: app.storage_value_snapshot,
    storageUnit: app.storage_unit_snapshot,
    stage: portal.data.stage,
    publicNote: portal.data.public_note,
    paymentDueAt: portal.data.payment_due_at,
    updatedAt: portal.data.updated_at,
    paymentAccount: {
      id: account.id,
      bankName: account.bank_name,
      accountHolder: account.account_holder,
      iban: account.iban,
      branch: account.branch,
      description: account.description,
    },
    paymentPlan: {
      configId: plan.payment_config_id,
      configRevision: plan.payment_config_revision,
      productPriceMinor: Number(plan.product_price_minor),
      thresholdMinor: Number(plan.threshold_minor),
      downPaymentRateBps: plan.down_payment_rate_bps,
      downPaymentAmountMinor: Number(plan.down_payment_amount_minor),
      remainingPrincipalMinor: Number(plan.remaining_principal_minor),
      financeChargeRateBps: plan.finance_charge_rate_bps,
      financeChargeAmountMinor: Number(plan.finance_charge_amount_minor),
      financedTotalMinor: Number(plan.financed_total_minor),
      installmentCount: plan.installment_count,
      installmentSchedule: plan.installment_schedule.map((entry) => ({
        installment: entry.installment,
        amountMinor: Number(entry.amount_minor),
      })),
      totalPayableMinor: Number(plan.total_payable_minor),
    },
  };
}
