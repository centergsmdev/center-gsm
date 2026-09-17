import { NextResponse } from "next/server";

import {
  getAdminContext,
  getInstallmentHashSecret,
  INSTALLMENT_STORAGE_BUCKET,
  mapAdminApplication,
} from "@/lib/installment/server";
import { isUuid } from "@/lib/installment/validation";
import { sanitizeInstallmentContractContent } from "@/lib/installment/contract-server";
import {
  createInstallmentPortalHandoff,
  mapAdminCustomerPortal,
} from "@/lib/installment/customer-portal";
import type { InstallmentAdminPaymentPlan } from "@/lib/installment/types";
import { PAYMENT_RECEIPTS_BUCKET } from "@/lib/payment-receipts/client";
import { sameOriginRequest } from "@/lib/installment/server-security";
import { requireAdminDeletionPassword } from "@/lib/admin/deletion-password";

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

  const [application, documents, contract, paymentPlan, portal, accounts] =
    await Promise.all([
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
      context.service
        .from("installment_customer_portals")
        .select("*")
        .eq("application_id", id)
        .maybeSingle(),
      context.service
        .from("payment_accounts")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at"),
    ]);
  if (
    application.error ||
    documents.error ||
    contract.error ||
    paymentPlan.error ||
    portal.error ||
    accounts.error
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
  const portalHandoff = createInstallmentPortalHandoff({
    status: mappedApplication.status,
    applicantName: mappedApplication.applicantName,
    phone: mappedApplication.phone,
    paymentPlan: mappedPaymentPlan,
    portal: portal.data,
    secret: getInstallmentHashSecret(),
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
        paymentAccounts: accounts.data.map((account) => ({
          id: account.id,
          bankName: account.bank_name,
          accountHolder: account.account_holder,
          iban: account.iban,
          branch: account.branch,
          description: account.description,
          isDefault: account.is_default,
        })),
        customerPortal: portal.data
          ? mapAdminCustomerPortal(portal.data)
          : null,
        portalHandoff,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOriginRequest(request))
    return NextResponse.json(
      { error: "Geçersiz istek kaynağı." },
      { status: 403 },
    );
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

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Silme şifresi okunamadı." },
      { status: 400 },
    );
  }
  const passwordError = await requireAdminDeletionPassword(
    context.service,
    body.password,
  );
  if (passwordError) return passwordError;

  const [application, documents, receipts] = await Promise.all([
    context.service
      .from("installment_applications")
      .select("id,application_number")
      .eq("id", id)
      .maybeSingle(),
    context.service
      .from("installment_application_documents")
      .select("storage_path")
      .eq("application_id", id),
    context.service
      .from("installment_payment_receipts")
      .select("storage_path")
      .eq("application_id", id),
  ]);
  if (application.error || documents.error || receipts.error)
    return NextResponse.json(
      { error: "Başvuruya bağlı kayıtlar okunamadı." },
      { status: 500 },
    );
  if (!application.data)
    return NextResponse.json({ error: "Başvuru bulunamadı." }, { status: 404 });

  const removed = await context.service
    .from("installment_applications")
    .delete()
    .eq("id", id);
  if (removed.error) {
    console.error("Installment application delete failed", {
      code: removed.error.code,
      message: removed.error.message,
    });
    return NextResponse.json({ error: "Başvuru silinemedi." }, { status: 500 });
  }

  const remaining = await context.service
    .from("installment_applications")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (remaining.error || remaining.data)
    return NextResponse.json(
      { error: "Başvuru silme işlemi doğrulanamadı." },
      { status: 500 },
    );

  const documentPaths = documents.data.map((item) => item.storage_path);
  const receiptPaths = receipts.data.map((item) => item.storage_path);
  const cleanups = await Promise.all([
    documentPaths.length
      ? context.service.storage
          .from(INSTALLMENT_STORAGE_BUCKET)
          .remove(documentPaths)
      : Promise.resolve({ error: null }),
    receiptPaths.length
      ? context.service.storage
          .from(PAYMENT_RECEIPTS_BUCKET)
          .remove(receiptPaths)
      : Promise.resolve({ error: null }),
  ]);

  return NextResponse.json(
    {
      ok: true,
      warning: cleanups.some((item) => item.error)
        ? "Başvuru silindi ancak bazı özel dosyalar depodan temizlenemedi."
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
