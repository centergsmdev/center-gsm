"use client";

import { metaEventId } from "@/lib/meta/item-id";

type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "Search"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

export type MetaCustomData = {
  currency?: "TRY";
  value?: number;
  content_ids?: string[];
  content_name?: string;
  content_type?: "product";
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  search_string?: string;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMetaEvent(
  eventName: MetaEventName,
  customData: MetaCustomData = {},
  options: { eventId?: string; server?: boolean } = {},
) {
  if (typeof window === "undefined") return "";
  const eventId = options.eventId ?? metaEventId(eventName);
  window.fbq?.("track", eventName, customData, { eventID: eventId });
  if (options.server && eventName !== "Purchase") {
    void fetch("/api/meta/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        sourceUrl: window.location.href,
        customData,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }
  return eventId;
}

export function trackMetaPurchase(input: {
  orderId: string;
  value: number;
  contents: NonNullable<MetaCustomData["contents"]>;
}) {
  const eventId = metaEventId("Purchase", input.orderId);
  const customData: MetaCustomData = {
    currency: "TRY",
    value: input.value,
    content_type: "product",
    content_ids: input.contents.map((item) => item.id),
    contents: input.contents,
  };
  trackMetaEvent("Purchase", customData, { eventId });
  void fetch("/api/meta/purchase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: input.orderId, eventId }),
    keepalive: true,
  }).catch(() => undefined);
}
