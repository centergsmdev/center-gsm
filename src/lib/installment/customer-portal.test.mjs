import assert from "node:assert/strict";
import test from "node:test";

import {
  createPortalAccessUrl,
  createPortalAccessToken,
  portalAccessCookieName,
  verifyPortalAccessToken,
} from "./customer-portal-security.ts";

const secret = "test-secret-with-enough-entropy-for-hmac";
const claims = {
  portalId: "11111111-1111-4111-8111-111111111111",
  accessVersion: 3,
  accessExpiresAt: "2030-01-01T00:00:00.000Z",
};

test("müşteri portal tokenı portal, sürüm ve son kullanma tarihine bağlıdır", () => {
  const token = createPortalAccessToken(claims, secret);
  assert.equal(
    verifyPortalAccessToken(token, claims, secret, Date.UTC(2029, 0, 1)),
    true,
  );
  assert.equal(
    verifyPortalAccessToken(
      token,
      { ...claims, accessVersion: 4 },
      secret,
      Date.UTC(2029, 0, 1),
    ),
    false,
  );
  assert.equal(
    verifyPortalAccessToken(
      `${token.slice(0, -1)}x`,
      claims,
      secret,
      Date.UTC(2029, 0, 1),
    ),
    false,
  );
});

test("süresi dolmuş müşteri portal tokenı reddedilir", () => {
  const token = createPortalAccessToken(claims, secret);
  assert.equal(
    verifyPortalAccessToken(token, claims, secret, Date.UTC(2031, 0, 1)),
    false,
  );
});

test("portal çerezi başvuru portalına özgü ve tahmin edilebilir addadır", () => {
  assert.equal(
    portalAccessCookieName(claims.portalId),
    "cg_installment_11111111111141118111111111111111",
  );
});

test("müşteri bağlantısı yalnız resmi CENTER GSM alan adında üretilir", () => {
  const url = createPortalAccessUrl(claims.portalId, "1.123.imza");
  assert.equal(
    url,
    "https://centergsm.com.tr/elden-taksit/takip/11111111-1111-4111-8111-111111111111/erisim?token=1.123.imza",
  );
  assert.equal(url.includes("vercel.app"), false);
});
