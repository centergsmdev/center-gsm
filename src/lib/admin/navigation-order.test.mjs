import assert from "node:assert/strict";
import test from "node:test";

import {
  moveAdminNavigationItem,
  moveAdminNavigationItemByOffset,
  normalizeAdminNavigationOrder,
} from "./navigation-order.ts";

const defaults = ["/admin", "/admin/urunler", "/admin/siparisler"];

test("kaydedilen sıra doğrulanır ve yeni menü seçenekleri sona eklenir", () => {
  assert.deepEqual(
    normalizeAdminNavigationOrder(
      ["/admin/siparisler", "/gecersiz", "/admin", "/admin"],
      defaults,
    ),
    ["/admin/siparisler", "/admin", "/admin/urunler"],
  );
});

test("sürüklenen menü seçeneği hedef sıraya taşınır", () => {
  assert.deepEqual(
    moveAdminNavigationItem(defaults, "/admin", "/admin/siparisler"),
    ["/admin/urunler", "/admin/siparisler", "/admin"],
  );
});

test("klavye düğmeleri seçeneği bir basamak taşır ve sınırı aşmaz", () => {
  assert.deepEqual(
    moveAdminNavigationItemByOffset(defaults, "/admin/siparisler", -1),
    ["/admin", "/admin/siparisler", "/admin/urunler"],
  );
  assert.deepEqual(
    moveAdminNavigationItemByOffset(defaults, "/admin", -1),
    defaults,
  );
});
