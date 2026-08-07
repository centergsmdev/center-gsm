export function metaItemId(productId: string, variantId?: string | null) {
  return variantId?.trim() || productId.trim();
}

export function metaEventId(eventName: string, seed?: string) {
  if (seed) return `${eventName.toLowerCase()}_${seed}`;
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${eventName.toLowerCase()}_${random}`;
}
