export const ADMIN_NAVIGATION_ORDER_EVENT = "center-gsm:admin-navigation-order";
const STORAGE_PREFIX = "center-gsm:admin-navigation-order:v1";
const PRESET_STORAGE_PREFIX = "center-gsm:admin-navigation-preset:v1";

export function adminNavigationStorageKey(email?: string | null) {
  const identity = email?.trim().toLowerCase() || "default";
  return `${STORAGE_PREFIX}:${identity}`;
}

export function adminNavigationPresetStorageKey(email?: string | null) {
  const identity = email?.trim().toLowerCase() || "default";
  return `${PRESET_STORAGE_PREFIX}:${identity}:layout-1`;
}

export function normalizeAdminNavigationOrder(
  candidate: unknown,
  defaults: readonly string[],
) {
  if (!Array.isArray(candidate)) return [...defaults];
  const allowed = new Set(defaults);
  const seen = new Set<string>();
  const ordered = candidate.flatMap((value) => {
    if (typeof value !== "string" || !allowed.has(value) || seen.has(value))
      return [];
    seen.add(value);
    return [value];
  });
  return [...ordered, ...defaults.filter((href) => !seen.has(href))];
}

export function moveAdminNavigationItem(
  order: readonly string[],
  sourceHref: string,
  targetHref: string,
) {
  const sourceIndex = order.indexOf(sourceHref);
  const targetIndex = order.indexOf(targetHref);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex)
    return [...order];
  const next = [...order];
  const [source] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, source);
  return next;
}

export function moveAdminNavigationItemByOffset(
  order: readonly string[],
  href: string,
  offset: -1 | 1,
) {
  const sourceIndex = order.indexOf(href);
  const targetIndex = sourceIndex + offset;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= order.length)
    return [...order];
  return moveAdminNavigationItem(order, href, order[targetIndex]);
}
