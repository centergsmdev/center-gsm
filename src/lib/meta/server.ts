import { NextResponse } from "next/server";

const allowedEvents = new Set([
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
]);

export function metaServerConfigured() {
  return Boolean(
    process.env.META_DATASET_ID?.trim() &&
    process.env.META_ACCESS_TOKEN?.trim(),
  );
}

export async function sendMetaServerEvent(input: {
  eventName: string;
  eventId: string;
  sourceUrl: string;
  customData: Record<string, unknown>;
}) {
  const dataset = process.env.META_DATASET_ID?.trim();
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!dataset || !token || !allowedEvents.has(input.eventName)) return false;
  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.sourceUrl,
        custom_data: input.customData,
      },
    ],
  };
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) payload.test_event_code = testCode;
  const response = await fetch(
    `https://graph.facebook.com/v23.0/${encodeURIComponent(dataset)}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  return response.ok;
}

export function acceptedResponse(configured = metaServerConfigured()) {
  return NextResponse.json({ accepted: true, configured }, { status: 202 });
}
