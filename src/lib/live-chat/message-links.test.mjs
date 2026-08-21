import assert from "node:assert/strict";
import test from "node:test";

import { parseChatMessageLinks } from "./message-links.ts";

test("https bağlantısını sorgu parametreleriyle birlikte ayırır", () => {
  const message =
    "Ürünü açın: https://www.centergsm.com.tr/urun/telefon?color=Ada&storage=256-GB";
  assert.deepEqual(parseChatMessageLinks(message), [
    { type: "text", value: "Ürünü açın: " },
    {
      type: "link",
      value:
        "https://www.centergsm.com.tr/urun/telefon?color=Ada&storage=256-GB",
      href: "https://www.centergsm.com.tr/urun/telefon?color=Ada&storage=256-GB",
    },
  ]);
});

test("www ile başlayan adresi güvenli https bağlantısına çevirir", () => {
  assert.deepEqual(parseChatMessageLinks("www.centergsm.com.tr/iletisim"), [
    {
      type: "link",
      value: "www.centergsm.com.tr/iletisim",
      href: "https://www.centergsm.com.tr/iletisim",
    },
  ]);
});

test("cümlenin sonundaki noktalama işaretini bağlantının dışında bırakır", () => {
  assert.deepEqual(
    parseChatMessageLinks("Buraya bakın (https://example.com/test)."),
    [
      { type: "text", value: "Buraya bakın (" },
      {
        type: "link",
        value: "https://example.com/test",
        href: "https://example.com/test",
      },
      { type: "text", value: ")." },
    ],
  );
});

test("HTML ve javascript ifadelerini bağlantıya dönüştürmez", () => {
  const message = "<script>alert(1)</script> javascript:alert(1)";
  assert.deepEqual(parseChatMessageLinks(message), [
    { type: "text", value: message },
  ]);
});
