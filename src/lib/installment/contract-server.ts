import { formatCurrency } from "../format";
import { renderInstallmentContract } from "./contract-render";
import {
  contractOfferCanBeUsed,
  createInstallmentContractOfferToken,
  hashInstallmentContractContent,
  sanitizeInstallmentContractContent,
  validateInstallmentContractTemplate,
  verifyInstallmentContractOfferToken,
} from "./contract-security";
import type {
  InstallmentContractOffer,
  InstallmentContractTemplate,
  InstallmentProductSummary,
} from "./types";
import type {
  InstallmentContractTemplateRow,
  Database,
} from "../../types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  describePaymentSchedule,
  formatBasisPoints,
  formatMinorCurrency,
  type PaymentPlan,
} from "../payment-plan/engine";

export type ContractSnapshot = {
  application_id: string;
  contract_template_id: string;
  contract_title: string;
  contract_version: string;
  rendered_contract_content: string;
  presented_at: string;
};

export {
  sanitizeInstallmentContractContent,
  validateInstallmentContractTemplate,
} from "./contract-security";

function formatContractDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function mapTemplate(
  row: InstallmentContractTemplateRow,
): InstallmentContractTemplate {
  return {
    id: row.id,
    title: row.title,
    version: row.version,
    contentHtml: sanitizeInstallmentContractContent(row.content_html),
    contentHash: row.content_sha256,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getActiveInstallmentContractOffer(
  service: SupabaseClient<Database>,
  product: InstallmentProductSummary,
  secret: string,
): Promise<InstallmentContractOffer | null> {
  if (!secret) return null;
  const result = await service
    .from("installment_contract_templates")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const template = mapTemplate(result.data);
  const validation = validateInstallmentContractTemplate(template);
  if (!validation.data) return null;
  const contentHash = hashInstallmentContractContent(
    validation.data.contentHtml,
  );
  if (contentHash !== template.contentHash) return null;
  const presentedAt = new Date().toISOString();
  return {
    ...template,
    contentHtml: validation.data.contentHtml,
    presentedAt,
    offerToken: createInstallmentContractOfferToken(
      {
        templateId: template.id,
        productId: product.productId,
        variantId: product.variantId,
        contentHash,
        presentedAt,
      },
      secret,
    ),
  };
}

export async function resolveInstallmentContractSnapshot(
  service: SupabaseClient<Database>,
  input: {
    applicationId: string;
    offerToken: string;
    product: InstallmentProductSummary;
    applicantName: string;
    paymentPlan: PaymentPlan;
  },
  secret: string,
): Promise<
  { data: ContractSnapshot; error: null } | { data: null; error: string }
> {
  const offer = verifyInstallmentContractOfferToken(
    input.offerToken,
    {
      productId: input.product.productId,
      variantId: input.product.variantId,
    },
    secret,
  );
  if (!offer) return { data: null, error: "Başvuru sözleşmesi doğrulanamadı." };

  const [templateResult, activeResult] = await Promise.all([
    service
      .from("installment_contract_templates")
      .select("*")
      .eq("id", offer.templateId)
      .maybeSingle(),
    service
      .from("installment_contract_templates")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);
  if (templateResult.error || activeResult.error || !templateResult.data)
    return {
      data: null,
      error:
        "Başvuru sözleşmesi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
    };
  const template = mapTemplate(templateResult.data);
  const validation = validateInstallmentContractTemplate(template);
  if (
    !validation.data ||
    hashInstallmentContractContent(validation.data.contentHtml) !==
      offer.contentHash ||
    !contractOfferCanBeUsed(template.isActive, Boolean(activeResult.data))
  )
    return {
      data: null,
      error:
        "Başvuru sözleşmesi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
    };

  return {
    data: {
      application_id: input.applicationId,
      contract_template_id: template.id,
      contract_title: template.title,
      contract_version: template.version,
      rendered_contract_content: renderInstallmentContract(
        validation.data.contentHtml,
        {
          customer_name: input.applicantName,
          product_name: input.product.productName,
          variant_name: input.product.variantTitle ?? "Varyantsız ürün",
          product_price: formatCurrency(input.product.price),
          application_date: formatContractDate(offer.presentedAt),
          down_payment_rate: `%${formatBasisPoints(input.paymentPlan.downPaymentRateBps)}`,
          down_payment_amount: formatMinorCurrency(
            input.paymentPlan.downPaymentAmountMinor,
          ),
          remaining_principal: formatMinorCurrency(
            input.paymentPlan.remainingPrincipalMinor,
          ),
          finance_charge_rate: `%${formatBasisPoints(input.paymentPlan.financeChargeRateBps)}`,
          finance_charge_amount: formatMinorCurrency(
            input.paymentPlan.financeChargeAmountMinor,
          ),
          installment_count: `${input.paymentPlan.installmentCount} Ay`,
          installment_schedule: describePaymentSchedule(
            input.paymentPlan.installmentSchedule,
          ),
          total_payable: formatMinorCurrency(
            input.paymentPlan.totalPayableMinor,
          ),
        },
      ),
      presented_at: offer.presentedAt,
    },
    error: null,
  };
}
