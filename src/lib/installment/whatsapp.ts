import type {
  InstallmentAdminPaymentPlan,
  InstallmentApplicationStatus,
  InstallmentWhatsAppHandoff,
} from "./types";

const snapshotMoneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatSnapshotCurrency(valueMinor: number) {
  return snapshotMoneyFormatter.format(valueMinor / 100);
}

function formatSnapshotRate(valueBps: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: valueBps % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valueBps / 100);
}

type WhatsAppHandoffSource = {
  status: InstallmentApplicationStatus;
  applicantName: string;
  phone: string;
  productName: string;
  variantTitle: string | null;
  paymentPlan: InstallmentAdminPaymentPlan | null;
};

export function shouldShowWhatsAppApprovalAction(
  status: InstallmentApplicationStatus,
) {
  return status === "approved";
}

export function normalizeWhatsAppTurkishPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^5\d{9}$/.test(digits) ? `90${digits}` : null;
}

export function renderInstallmentScheduleForWhatsApp(
  schedule: InstallmentAdminPaymentPlan["installmentSchedule"],
) {
  return schedule
    .map(
      (item) =>
        `${item.installment}. Taksit: ${formatSnapshotCurrency(item.amountMinor)}`,
    )
    .join("\n");
}

export function createInstallmentWhatsAppHandoff(
  source: WhatsAppHandoffSource,
): InstallmentWhatsAppHandoff {
  if (!shouldShowWhatsAppApprovalAction(source.status))
    return { state: "not_approved" };
  if (!source.paymentPlan) return { state: "missing_payment_plan" };
  const phone = normalizeWhatsAppTurkishPhone(source.phone);
  if (!phone) return { state: "invalid_phone" };

  const firstName = source.applicantName.trim().split(/\s+/)[0];
  const productTitle = source.variantTitle?.trim() || source.productName;
  const plan = source.paymentPlan;
  const message = [
    `Merhaba ${firstName},`,
    "",
    "CENTER GSM elden taksit başvurunuz onaylanmıştır. ✅",
    "",
    `Ürün: ${productTitle}`,
    `Ürün Fiyatı: ${formatSnapshotCurrency(plan.productPriceMinor)}`,
    "",
    `Peşinat (%${formatSnapshotRate(plan.downPaymentRateBps)}): ${formatSnapshotCurrency(plan.downPaymentAmountMinor)}`,
    "",
    `Kalan Ana Tutar: ${formatSnapshotCurrency(plan.remainingPrincipalMinor)}`,
    "",
    `Vade Farkı (%${formatSnapshotRate(plan.financeChargeRateBps)}): ${formatSnapshotCurrency(plan.financeChargeAmountMinor)}`,
    "",
    `Taksitlendirilen Tutar: ${formatSnapshotCurrency(plan.financedTotalMinor)}`,
    "",
    `Vade: ${plan.installmentCount} Ay`,
    "",
    "Ödeme Planınız:",
    "",
    renderInstallmentScheduleForWhatsApp(plan.installmentSchedule),
    "",
    `Toplam Ödeme: ${formatSnapshotCurrency(plan.totalPayableMinor)}`,
    "",
    "Başvurunuzun sonraki işlemleri için bizimle bu WhatsApp görüşmesi üzerinden iletişime geçebilirsiniz.",
    "",
    "CENTER GSM",
  ].join("\n");

  return {
    state: "ready",
    phone,
    message,
    url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
  };
}
