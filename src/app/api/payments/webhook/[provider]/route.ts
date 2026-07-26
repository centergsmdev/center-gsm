import { NextResponse } from "next/server";
import {
  isPaymentProviderCode,
  PAYMENT_WEBHOOK_SIGNATURE_HEADER,
  processPaymentWebhook,
} from "@/lib/payments/webhooks-entry";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isPaymentProviderCode(provider)) {
    return NextResponse.json(
      { error: "Bilinmeyen sağlayıcı." },
      { status: 404 },
    );
  }

  const signature = request.headers.get(PAYMENT_WEBHOOK_SIGNATURE_HEADER) ?? "";
  if (!signature) {
    return NextResponse.json(
      { error: "Webhook imzası eksik." },
      { status: 401 },
    );
  }

  const result = await processPaymentWebhook(
    provider,
    await request.text(),
    signature,
  );
  return NextResponse.json(result.data ?? { error: result.error }, {
    status: result.status,
  });
}
