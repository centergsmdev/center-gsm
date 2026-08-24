import "server-only";

import {
  getInstallmentHashSecret,
  getInstallmentServiceClient,
} from "./server";
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
  cancellationReason: "payment_deadline_expired" | "admin_cancelled" | null;
  publicNote: string | null;
  paymentDueAt: string | null;
  updatedAt: string;
  paymentAccount: InstallmentPortalPaymentSnapshot;
  paymentPlan: InstallmentAdminPaymentPlan;
  receipt: InstallmentCustomerPortalReceipt | null;
};

export type InstallmentCustomerPortalReceipt = {
  id: string;
  originalName: string;
  status: "pending_review" | "approved" | "rejected";
  rejectionReason: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
};

export async function getAuthorizedCustomerPortal(
  portalId: string,
  accessToken: string | null,
) {
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
  const expired = await service.rpc("expire_overdue_installment_portals", {
    p_portal_id: portal.data.id,
    p_phone_e164: null,
  });
  if (expired.error) return null;
  if (Number(expired.data) < 1) return { service, portal: portal.data };
  const refreshed = await service
    .from("installment_customer_portals")
    .select("*")
    .eq("id", portalId)
    .maybeSingle();
  if (refreshed.error || !refreshed.data) return null;
  return { service, portal: refreshed.data };
}

export async function getCustomerPortalData(
  portalId: string,
  accessToken: string | null,
): Promise<InstallmentCustomerPortalData | null> {
  const authorized = await getAuthorizedCustomerPortal(portalId, accessToken);
  if (!authorized) return null;
  const { service, portal } = authorized;
  const [application, paymentPlan, currentPaymentAccount, latestReceipt] =
    await Promise.all([
      service
        .from("installment_applications")
        .select("*")
        .eq("id", portal.application_id)
        .maybeSingle(),
      service
        .from("installment_application_payment_plans")
        .select("*")
        .eq("application_id", portal.application_id)
        .maybeSingle(),
      portal.payment_account_id
        ? service
            .from("payment_accounts")
            .select("id,bank_name,account_holder,iban,branch,description")
            .eq("id", portal.payment_account_id)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      service
        .from("installment_payment_receipts")
        .select("*")
        .eq("portal_id", portal.id)
        .is("superseded_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (
    application.error ||
    paymentPlan.error ||
    latestReceipt.error ||
    !application.data ||
    !paymentPlan.data
  )
    return null;
  const app = application.data;
  const applicationCanBeShown =
    app.status === "approved" ||
    (app.status === "cancelled" &&
      portal.cancellation_reason === "payment_deadline_expired");
  if (!applicationCanBeShown) return null;
  const plan = paymentPlan.data;
  const account = currentPaymentAccount.data
    ? {
        id: currentPaymentAccount.data.id,
        bank_name: currentPaymentAccount.data.bank_name,
        account_holder: currentPaymentAccount.data.account_holder,
        iban: currentPaymentAccount.data.iban,
        branch: currentPaymentAccount.data.branch,
        description: currentPaymentAccount.data.description,
      }
    : portal.payment_account_snapshot;
  return {
    portalId: portal.id,
    applicationNumber: app.application_number,
    applicantName: app.applicant_name,
    productName: app.product_name_snapshot,
    variantTitle: app.variant_title_snapshot,
    sku: app.sku_snapshot,
    imageUrl: app.image_url_snapshot,
    color: app.color_snapshot,
    storageValue: app.storage_value_snapshot,
    storageUnit: app.storage_unit_snapshot,
    stage: portal.stage,
    cancellationReason: portal.cancellation_reason,
    publicNote: portal.public_note,
    paymentDueAt: portal.payment_due_at,
    updatedAt: portal.updated_at,
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
    receipt: latestReceipt.data
      ? {
          id: latestReceipt.data.id,
          originalName: latestReceipt.data.original_name,
          status: latestReceipt.data.status,
          rejectionReason: latestReceipt.data.rejection_reason_public,
          uploadedAt: latestReceipt.data.uploaded_at,
          reviewedAt: latestReceipt.data.reviewed_at,
        }
      : null,
  };
}
