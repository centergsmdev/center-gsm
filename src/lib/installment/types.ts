export const INSTALLMENT_DOCUMENT_TYPES = [
  "identity_front",
  "identity_back",
  "residence",
  "signature",
] as const;

export type InstallmentDocumentType =
  (typeof INSTALLMENT_DOCUMENT_TYPES)[number];

export type InstallmentApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type InstallmentProductSummary = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantTitle: string | null;
  sku: string;
  price: number;
  imageUrl: string | null;
  color: string | null;
  storageValue: number | null;
  storageUnit: "GB" | "TB" | null;
};

export type InstallmentContractTemplate = {
  id: string;
  title: string;
  version: string;
  contentHtml: string;
  contentHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InstallmentContractOffer = InstallmentContractTemplate & {
  presentedAt: string;
  offerToken: string;
};

export type InstallmentDraftResponse = {
  applicationId: string;
  applicationNumber: string;
  status: InstallmentApplicationStatus;
};

export type InstallmentAdminListItem = InstallmentProductSummary & {
  id: string;
  applicationNumber: string;
  applicantName: string;
  phone: string;
  email: string | null;
  status: InstallmentApplicationStatus;
  revision: number;
  createdAt: string;
  submittedAt: string | null;
};

export type InstallmentAdminDocument = {
  id: string;
  type: InstallmentDocumentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type InstallmentAdminDetail = InstallmentAdminListItem & {
  decisionAt: string | null;
  rejectionReasonPublic: string | null;
  internalNote: string | null;
  retentionReviewAt: string;
  documents: InstallmentAdminDocument[];
  contract: InstallmentAdminContractSnapshot | null;
  paymentPlan: InstallmentAdminPaymentPlan | null;
  paymentAccounts: InstallmentPortalPaymentAccount[];
  customerPortal: InstallmentAdminCustomerPortal | null;
  portalHandoff: InstallmentPortalHandoff;
};

export const INSTALLMENT_PORTAL_STAGES = [
  "down_payment_pending",
  "payment_under_review",
  "payment_confirmed",
  "preparing_delivery",
  "completed",
  "cancelled",
] as const;

export type InstallmentPortalStage =
  (typeof INSTALLMENT_PORTAL_STAGES)[number];

export type InstallmentPortalPaymentAccount = {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  branch: string | null;
  description: string | null;
  isDefault: boolean;
};

export type InstallmentPortalPaymentSnapshot = Omit<
  InstallmentPortalPaymentAccount,
  "isDefault"
>;

export type InstallmentAdminCustomerPortal = {
  id: string;
  stage: InstallmentPortalStage;
  publicNote: string | null;
  paymentDueAt: string | null;
  accessExpiresAt: string;
  paymentAccount: InstallmentPortalPaymentSnapshot;
};

export type InstallmentPortalHandoff =
  | { state: "not_approved" }
  | { state: "missing_payment_plan" }
  | { state: "not_configured" }
  | { state: "expired" }
  | {
      state: "ready";
      phone: string;
      message: string;
      url: string;
      accessUrl: string;
    };

export type InstallmentWhatsAppHandoff =
  | { state: "not_approved" }
  | { state: "missing_payment_plan" }
  | { state: "invalid_phone" }
  | { state: "ready"; phone: string; message: string; url: string };

export type InstallmentAdminPaymentPlan = {
  configId: string;
  configRevision: number;
  productPriceMinor: number;
  thresholdMinor: number;
  downPaymentRateBps: number;
  downPaymentAmountMinor: number;
  remainingPrincipalMinor: number;
  financeChargeRateBps: number;
  financeChargeAmountMinor: number;
  financedTotalMinor: number;
  installmentCount: number;
  installmentSchedule: Array<{ installment: number; amountMinor: number }>;
  totalPayableMinor: number;
};

export type InstallmentAdminContractSnapshot = {
  templateId: string;
  title: string;
  version: string;
  renderedContent: string;
  contentHash: string;
  presentedAt: string;
  acceptedAt: string;
  signatureDocumentId: string;
};

export const INSTALLMENT_STATUS_LABELS: Record<
  InstallmentApplicationStatus,
  string
> = {
  draft: "Taslak",
  submitted: "Bekliyor",
  under_review: "İnceleniyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal edildi",
};

export const INSTALLMENT_PORTAL_STAGE_LABELS: Record<
  InstallmentPortalStage,
  string
> = {
  down_payment_pending: "Peşinat Ödemesi Bekleniyor",
  payment_under_review: "Peşinat Kontrol Ediliyor",
  payment_confirmed: "Peşinat Onaylandı",
  preparing_delivery: "Teslimat Hazırlanıyor",
  completed: "İşlem Tamamlandı",
  cancelled: "İşlem İptal Edildi",
};

export const INSTALLMENT_DOCUMENT_LABELS: Record<
  InstallmentDocumentType,
  string
> = {
  identity_front: "Kimlik Ön Yüz",
  identity_back: "Kimlik Arka Yüz",
  residence: "İkametgâh Belgesi",
  signature: "İmza",
};
