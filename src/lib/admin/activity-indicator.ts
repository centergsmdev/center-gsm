export type AdminActivityKind = "order" | "receipt" | "message";

export const ADMIN_ACTIVITY_EVENT = "center-gsm:admin-activity";

export const ADMIN_ACTIVITY_STORAGE_KEY = "center-gsm:admin-activity-state";

export const adminActivityRoutes: Record<AdminActivityKind, string> = {
  order: "/admin/siparisler",
  receipt: "/admin/dekontlar",
  message: "/admin/canli-destek",
};

export type AdminActivityState = Record<AdminActivityKind, boolean>;

export const emptyAdminActivityState: AdminActivityState = {
  order: false,
  receipt: false,
  message: false,
};
