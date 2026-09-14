import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWhatsAppHref,
  formatWhatsAppPhone,
  normalizeWhatsAppPhone,
  representativeInitials,
} from "./whatsapp.ts";

test("normalizes common Turkish WhatsApp number formats", () => {
  assert.equal(normalizeWhatsAppPhone("0555 123 45 67"), "+905551234567");
  assert.equal(normalizeWhatsAppPhone("5551234567"), "+905551234567");
  assert.equal(normalizeWhatsAppPhone("+90 555 123 45 67"), "+905551234567");
  assert.equal(normalizeWhatsAppPhone("0090 555 123 45 67"), "+905551234567");
});

test("rejects invalid WhatsApp numbers", () => {
  assert.equal(normalizeWhatsAppPhone("123"), null);
  assert.equal(normalizeWhatsAppPhone(""), null);
});

test("builds an encoded wa.me link and formats Turkish display number", () => {
  assert.equal(
    buildWhatsAppHref("0555 123 45 67", "Merhaba dünya"),
    "https://wa.me/905551234567?text=Merhaba%20d%C3%BCnya",
  );
  assert.equal(formatWhatsAppPhone("+905551234567"), "0555 123 45 67");
});

test("creates stable representative initials", () => {
  assert.equal(representativeInitials("ayşe yılmaz"), "AY");
  assert.equal(representativeInitials("Alpay"), "A");
});
