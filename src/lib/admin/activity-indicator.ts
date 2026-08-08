export type AdminActivityKind = "order" | "receipt" | "message";

export const ADMIN_ACTIVITY_EVENT = "center-gsm:admin-activity";

export const ADMIN_ACTIVITY_STORAGE_KEY = "center-gsm:admin-activity-state";

export const ADMIN_UNSEEN_RECORDS_STORAGE_KEY =
  "center-gsm:admin-unseen-records";

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

export type AdminRecordActivityKind = Extract<
  AdminActivityKind,
  "order" | "receipt"
>;

export type AdminUnseenRecordsState = Record<AdminRecordActivityKind, string[]>;

export const emptyAdminUnseenRecordsState: AdminUnseenRecordsState = {
  order: [],
  receipt: [],
};

export function readAdminUnseenRecords(): AdminUnseenRecordsState {
  if (typeof window === "undefined") return emptyAdminUnseenRecordsState;

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(ADMIN_UNSEEN_RECORDS_STORAGE_KEY) ?? "{}",
    ) as Partial<AdminUnseenRecordsState>;

    return {
      order: Array.isArray(stored.order)
        ? stored.order.filter((id): id is string => typeof id === "string")
        : [],
      receipt: Array.isArray(stored.receipt)
        ? stored.receipt.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return emptyAdminUnseenRecordsState;
  }
}

export function writeAdminUnseenRecords(state: AdminUnseenRecordsState) {
  window.localStorage.setItem(
    ADMIN_UNSEEN_RECORDS_STORAGE_KEY,
    JSON.stringify(state),
  );
}

export function markAdminRecordUnseen(
  kind: AdminRecordActivityKind,
  entityId: string,
) {
  if (!entityId) return;
  const current = readAdminUnseenRecords();
  if (current[kind].includes(entityId)) return;

  writeAdminUnseenRecords({
    ...current,
    [kind]: [entityId, ...current[kind]].slice(0, 200),
  });
}

export function markAdminRecordSeen(
  kind: AdminRecordActivityKind,
  entityId: string,
) {
  const current = readAdminUnseenRecords();
  if (!current[kind].includes(entityId)) return;

  writeAdminUnseenRecords({
    ...current,
    [kind]: current[kind].filter((id) => id !== entityId),
  });
}
