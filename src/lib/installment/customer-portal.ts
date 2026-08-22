import type { InstallmentCustomerPortalRow } from "@/types/database";
import { createPortalAccessToken } from "./customer-portal-security";
import type {
  InstallmentAdminCustomerPortal,
  InstallmentAdminPaymentPlan,
  InstallmentApplicationStatus,
  InstallmentPortalHandoff,
} from "./types";
import { normalizeWhatsAppTurkishPhone } from "./whatsapp";

const DEFAULT_SITE_URL = "https://centergsm.com.tr";

export function mapAdminCustomerPortal(
  row: InstallmentCustomerPortalRow,
): InstallmentAdminCustomerPortal {
  const account = row.payment_account_snapshot;
  return {
    id: row.id,
    stage: row.stage,
    publicNote: row.public_note,
    paymentDueAt: row.payment_due_at,
    accessExpiresAt: row.access_expires_at,
    paymentAccount: {
      id: account.id,
      bankName: account.bank_name,
      accountHolder: account.account_holder,
      iban: account.iban,
      branch: account.branch,
      description: account.description,
    },
  };
}

export function createInstallmentPortalHandoff(source: {
  status: InstallmentApplicationStatus;
  applicantName: string;
  phone: string;
  paymentPlan: InstallmentAdminPaymentPlan | null;
  portal: InstallmentCustomerPortalRow | null;
  secret: string;
  siteUrl?: string;
}): InstallmentPortalHandoff {
  if (source.status !== "approved") return { state: "not_approved" };
  if (!source.paymentPlan) return { state: "missing_payment_plan" };
  if (!source.portal) return { state: "not_configured" };
  if (new Date(source.portal.access_expires_at).getTime() <= Date.now())
    return { state: "expired" };
  const token = createPortalAccessToken(
    {
      portalId: source.portal.id,
      accessVersion: source.portal.access_version,
      accessExpiresAt: source.portal.access_expires_at,
    },
    source.secret,
  );
  const phone = normalizeWhatsAppTurkishPhone(source.phone);
  if (!token || !phone) return { state: "expired" };
  const baseUrl = (source.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  const accessUrl = `${baseUrl}/elden-taksit/takip/${source.portal.id}/erisim?token=${encodeURIComponent(token)}`;
  const firstName = source.applicantName.trim().split(/\s+/)[0];
  const message = [
    `Merhaba ${firstName},`,
    "",
    "CENTER GSM elden taksit başvurunuz onaylanmıştır. ✅",
    "",
    "Ürün bilgilerinizi, ödeme planınızı, peşinat tutarınızı, ödeme bilgilerini ve işleminizin güncel aşamasını kişisel başvuru sayfanızdan görüntüleyebilirsiniz.",
    "",
    `Kişisel başvuru bağlantınız: ${accessUrl}`,
    "",
    "Güvenliğiniz için bu bağlantıyı başka kişilerle paylaşmayınız.",
    "",
    "CENTER GSM",
  ].join("\n");
  return {
    state: "ready",
    phone,
    message,
    accessUrl,
    url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
  };
}
