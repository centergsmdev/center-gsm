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

export const INSTALLMENT_DOCUMENT_LABELS: Record<
  InstallmentDocumentType,
  string
> = {
  identity_front: "Kimlik Ön Yüz",
  identity_back: "Kimlik Arka Yüz",
  residence: "İkametgâh Belgesi",
  signature: "İmza",
};
