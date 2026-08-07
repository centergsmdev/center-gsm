import { acceptedResponse, sendMetaServerEvent } from "@/lib/meta/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventName?: string;
      eventId?: string;
      sourceUrl?: string;
      customData?: Record<string, unknown>;
    };
    if (!body.eventName || !body.eventId || !body.sourceUrl)
      return acceptedResponse(false);
    await sendMetaServerEvent({
      eventName: body.eventName,
      eventId: body.eventId,
      sourceUrl: body.sourceUrl,
      customData: body.customData ?? {},
    });
  } catch {
    return acceptedResponse(false);
  }
  return acceptedResponse();
}
