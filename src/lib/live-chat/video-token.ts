import { createHmac, timingSafeEqual } from "node:crypto";

function jsonPart(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function signCallParticipantJwt(input: {
  secret: string;
  subject: string;
  callId: string;
  callNonce: string;
  callRole: "customer" | "admin";
  issuedAt: number;
  expiresAt: number;
}) {
  const header = jsonPart({ alg: "HS256", typ: "JWT" });
  const payload = jsonPart({
    iss: "supabase",
    aud: "authenticated",
    role: "authenticated",
    sub: input.subject,
    iat: input.issuedAt,
    exp: input.expiresAt,
    aal: "aal1",
    call_id: input.callId,
    call_nonce: input.callNonce,
    call_role: input.callRole,
    app_metadata: { role: "call_participant" },
    user_metadata: {},
  });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${signature(unsigned, input.secret)}`;
}

export function verifyCallParticipantJwt(
  token: string,
  secret: string,
  now: number,
) {
  const [header, payload, provided, extra] = token.split(".");
  if (!header || !payload || !provided || extra) return null;
  const expected = signature(`${header}.${payload}`, secret);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    return null;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      exp?: number;
      call_id?: string;
      call_nonce?: string;
      call_role?: string;
    };
    if (!Number.isSafeInteger(claims.exp) || Number(claims.exp) <= now)
      return null;
    return claims;
  } catch {
    return null;
  }
}
