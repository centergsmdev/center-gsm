import { NextResponse } from "next/server";

import { getAdminContext, mapAdminApplication } from "@/lib/installment/server";
import { isUuid } from "@/lib/installment/validation";
import { sanitizeInstallmentContractContent } from "@/lib/installment/contract-server";
import { createInstallmentWhatsAppHandoff } from "@/lib/installment/whatsapp";
import type { InstallmentAdminPaymentPlan } from "@/lib/installment/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id))
    return NextResponse.json(
      { error: "Başvuru kimliği geçersiz." },
      { status: 400 },
    );
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { error: "Admin yetkisi gerekiyor." },
      { status: 403 },
    );
  const [application, documents, contract, paymentPlan] = await Promise.all([
    context.service
      .from("installment_applications")
      .select("*")
      .eq("id", id)
      .neq("status", "draft")
      .maybeSingle(),
    context.service
      .from("installment_application_documents")
      .select(
        "id,application_id,document_type,original_name,stored_mime_type,size_bytes,created_at",
      )
      .eq("application_id", id)
      .order("created_at"),
    context.service
      .from("installment_application_contracts")
      .select("*")
      .eq("application_id", id)
      .maybeSingle(),
    context.service
      .from("installment_application_payment_plans")
      .select("*")
      .eq("application_id", id)
      .maybeSingle(),
  ]);
  if (
    application.error ||
    documents.error ||
    contract.error ||
    paymentPlan.error
  )
    return NextResponse.json(
      { error: "Başvuru yüklenemedi." },
      { status: 500 },
    );
  if (!application.data)
    return NextResponse.json({ error: "Başvuru bulunamadı." }, { status: 404 });
  const row = application.data;
  const mappedApplication = mapAdminApplication(row);
  const mappedPaymentPlan: InstallmentAdminPaymentPlan | null = paymentPlan.data
    ? {
        configId: paymentPlan.data.payment_config_id,
        configRevision: paymentPlan.data.payment_config_revision,
        productPriceMinor: Number(paymentPlan.data.product_price_minor),
        thresholdMinor: Number(paymentPlan.data.threshold_minor),
        downPaymentRateBps: paymentPlan.data.down_payment_rate_bps,
        downPaymentAmountMinor: Number(
          paymentPlan.data.down_payment_amount_minor,
        ),
        remainingPrincipalMinor: Number(
          paymentPlan.data.remaining_principal_minor,
        ),
        financeChargeRateBps: paymentPlan.data.finance_charge_rate_bps,
        financeChargeAmountMinor: Number(
          paymentPlan.data.finance_charge_amount_minor,
        ),
        financedTotalMinor: Number(paymentPlan.data.financed_total_minor),
        installmentCount: paymentPlan.data.installment_count,
        installmentSchedule: paymentPlan.data.installment_schedule.map(
          (entry) => ({
            installment: entry.installment,
            amountMinor: Number(entry.amount_minor),
          }),
        ),
        totalPayableMinor: Number(paymentPlan.data.total_payable_minor),
      }
    : null;
  const whatsappHandoff = createInstallmentWhatsAppHandoff({
    status: mappedApplication.status,
    applicantName: mappedApplication.applicantName,
    phone: mappedApplication.phone,
    productName: mappedApplication.productName,
    variantTitle: mappedApplication.variantTitle,
    paymentPlan: mappedPaymentPlan,
  });
  return NextResponse.json(
    {
      item: {
        ...mappedApplication,
        decisionAt: row.decision_at,
        rejectionReasonPublic: row.rejection_reason_public,
        internalNote: row.internal_note,
        retentionReviewAt: row.retention_review_at,
        documents: documents.data.map((document) => ({
          id: document.id,
          type: document.document_type,
          originalName: document.original_name,
          mimeType: document.stored_mime_type,
          sizeBytes: document.size_bytes,
          createdAt: document.created_at,
        })),
        contract:
          contract.data?.accepted_at && contract.data.signature_document_id
            ? {
                templateId: contract.data.contract_template_id,
                title: contract.data.contract_title,
                version: contract.data.contract_version,
                renderedContent: sanitizeInstallmentContractContent(
                  contract.data.rendered_contract_content,
                ),
                contentHash: contract.data.contract_content_hash,
                presentedAt: contract.data.presented_at,
                acceptedAt: contract.data.accepted_at,
                signatureDocumentId: contract.data.signature_document_id,
              }
            : null,
        paymentPlan: mappedPaymentPlan,
        whatsappHandoff,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
