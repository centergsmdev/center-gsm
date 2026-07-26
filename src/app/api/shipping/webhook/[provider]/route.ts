import { NextResponse } from "next/server";
import {
  SHIPPING_PROVIDER_KEYS,
  processShippingWebhook,
  type ShippingProviderKey,
} from "@/shipping/services/webhook-entry";
export const runtime = "nodejs";
const isProvider = (value: string): value is ShippingProviderKey =>
  SHIPPING_PROVIDER_KEYS.some((key) => key === value);
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProvider(provider) || provider === "manual")
    return NextResponse.json(
      { error: "Bilinmeyen sağlayıcı." },
      { status: 404 },
    );
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const signature = request.headers.get("x-shipping-signature") ?? "";
  if (!signature)
    return NextResponse.json(
      { error: "Webhook imzası eksik." },
      { status: 401 },
    );
  const result = await processShippingWebhook(
    provider,
    await request.text(),
    signature,
    contentType,
  );
  return NextResponse.json(result.data ?? { error: result.error }, {
    status: result.status,
  });
}
