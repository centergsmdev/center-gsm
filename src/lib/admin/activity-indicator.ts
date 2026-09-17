export type AdminActivityKind =
  "order" | "receipt" | "message" | "installment" | "tradeIn" | "customer";

export const ADMIN_ACTIVITY_EVENT = "center-gsm:admin-activity";
export const ADMIN_ACTIVITY_STATE_EVENT = "center-gsm:admin-activity-state";

export const ADMIN_ACTIVITY_STORAGE_KEY = "center-gsm:admin-activity-state";

export const ADMIN_ACTIVITY_SEEN_STORAGE_KEY_PREFIX =
  "center-gsm:admin-activity-seen:v1";

export const ADMIN_UNSEEN_RECORDS_STORAGE_KEY =
  "center-gsm:admin-unseen-records";

export const adminActivityRoutes: Record<AdminActivityKind, string> = {
  order: "/admin/siparisler",
  receipt: "/admin/dekontlar",
  message: "/admin/canli-destek",
  installment: "/admin/elden-taksit-basvurulari",
  tradeIn: "/admin/telefon-takas",
  customer: "/admin/musteriler",
};

export type AdminActivityState = Record<AdminActivityKind, boolean>;

export const emptyAdminActivityState: AdminActivityState = {
  order: false,
  receipt: false,
  message: false,
  installment: false,
  tradeIn: false,
  customer: false,
};

export type AdminActivitySeenAt = Partial<Record<AdminActivityKind, string>>;

export function adminActivitySeenStorageKey(identity?: string | null) {
  return `${ADMIN_ACTIVITY_SEEN_STORAGE_KEY_PREFIX}:${identity?.trim().toLowerCase() || "anonymous"}`;
}

export function normalizeAdminActivitySeenAt(
  value: unknown,
): AdminActivitySeenAt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      ([kind, timestamp]) =>
        kind in emptyAdminActivityState &&
        typeof timestamp === "string" &&
        Number.isFinite(Date.parse(timestamp)),
    ),
  ) as AdminActivitySeenAt;
}

export function mergeAdminActivitySeenAt(
  ...sources: unknown[]
): AdminActivitySeenAt {
  const merged: AdminActivitySeenAt = {};

  for (const source of sources) {
    const normalized = normalizeAdminActivitySeenAt(source);
    for (const kind of Object.keys(normalized) as AdminActivityKind[]) {
      const candidate = normalized[kind];
      const current = merged[kind];
      if (
        candidate &&
        (!current || Date.parse(candidate) > Date.parse(current))
      ) {
        merged[kind] = candidate;
      }
    }
  }

  return merged;
}

export function createAdminActivityBaseline(
  timestamp = new Date().toISOString(),
) {
  return Object.fromEntries(
    Object.keys(emptyAdminActivityState).map((kind) => [kind, timestamp]),
  ) as Record<AdminActivityKind, string>;
}

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
