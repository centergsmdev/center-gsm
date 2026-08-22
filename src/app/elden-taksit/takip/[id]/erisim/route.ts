import { NextResponse } from "next/server";

import {
  portalAccessCookieName,
  verifyPortalAccessToken,
} from "@/lib/installment/customer-portal-security";
import {
  getInstallmentHashSecret,
  getInstallmentServiceClient,
} from "@/lib/installment/server";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestUrl = new URL(request.url);
  const destination = new URL(`/elden-taksit/takip/${id}`, requestUrl.origin);
  const token = requestUrl.searchParams.get("token");
  const service = getInstallmentServiceClient();
  const secret = getInstallmentHashSecret();
  if (!isUuid(id) || !service || !secret || !token)
    return NextResponse.redirect(destination, 303);
  const portal = await service
    .from("installment_customer_portals")
    .select("id,access_version,access_expires_at")
    .eq("id", id)
    .maybeSingle();
  if (
    portal.error ||
    !portal.data ||
    !verifyPortalAccessToken(
      token,
      {
        portalId: portal.data.id,
        accessVersion: portal.data.access_version,
        accessExpiresAt: portal.data.access_expires_at,
      },
      secret,
    )
  )
    return NextResponse.redirect(destination, 303);
  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(portalAccessCookieName(id), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: `/elden-taksit/takip/${id}`,
    expires: new Date(portal.data.access_expires_at),
  });
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
