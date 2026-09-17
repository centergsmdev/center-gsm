import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  adminNavigationPresetStorageKey,
  moveAdminNavigationItem,
  moveAdminNavigationItemByOffset,
  normalizeAdminNavigationOrder,
} from "./navigation-order.ts";
import {
  adminActivitySeenStorageKey,
  adminActivityRoutes,
  createAdminActivityBaseline,
  mergeAdminActivitySeenAt,
  normalizeAdminActivitySeenAt,
} from "./activity-indicator.ts";

const defaults = ["/admin", "/admin/urunler", "/admin/siparisler"];
const adminSidebar = readFileSync(
  new URL("../../components/admin/admin-sidebar.tsx", import.meta.url),
  "utf8",
);

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

test("1. menü düzeni yönetici hesabına özel sabit anahtarla saklanır", () => {
  assert.equal(
    adminNavigationPresetStorageKey("YONETICI@EXAMPLE.COM"),
    "center-gsm:admin-navigation-preset:v1:yonetici@example.com:layout-1",
  );
});

test("operasyon bildirimleri istenen altı yönetim bölümünü kapsar", () => {
  const timestamp = "2026-09-17T12:00:00.000Z";
  assert.deepEqual(createAdminActivityBaseline(timestamp), {
    order: timestamp,
    receipt: timestamp,
    message: timestamp,
    installment: timestamp,
    tradeIn: timestamp,
    customer: timestamp,
  });
  assert.deepEqual(adminActivityRoutes, {
    order: "/admin/siparisler",
    receipt: "/admin/dekontlar",
    message: "/admin/canli-destek",
    installment: "/admin/elden-taksit-basvurulari",
    tradeIn: "/admin/telefon-takas",
    customer: "/admin/musteriler",
  });
});

test("canlı destek rozeti yalnız gerçekten okunmamış müşteri mesajlarını sayar", () => {
  assert.match(
    adminSidebar,
    /from\("live_chat_messages"\)[\s\S]{0,220}\.eq\("sender", "customer"\)[\s\S]{0,100}\.is\("read_at", null\)/,
  );
  assert.doesNotMatch(
    adminSidebar,
    /from\("live_chat_messages"\)[\s\S]{0,260}\.gt\("created_at", since\("message"\)\)/,
  );
});

test("bildirimlerin görüldü zamanı hesap bazında ve en yeni değer korunarak saklanır", () => {
  assert.equal(
    adminActivitySeenStorageKey(" YONETICI@EXAMPLE.COM "),
    "center-gsm:admin-activity-seen:v1:yonetici@example.com",
  );
  assert.deepEqual(
    normalizeAdminActivitySeenAt({
      customer: "2026-09-18T00:01:00.000Z",
      message: "gecersiz",
      unknown: "2026-09-18T00:02:00.000Z",
    }),
    { customer: "2026-09-18T00:01:00.000Z" },
  );
  assert.deepEqual(
    mergeAdminActivitySeenAt(
      {
        customer: "2026-09-17T20:00:00.000Z",
        order: "2026-09-18T00:05:00.000Z",
      },
      {
        customer: "2026-09-18T00:10:00.000Z",
        order: "2026-09-17T23:00:00.000Z",
      },
    ),
    {
      customer: "2026-09-18T00:10:00.000Z",
      order: "2026-09-18T00:05:00.000Z",
    },
  );
});

test("tüm operasyon bildirimlerinin görüldü zamanı gerçekten veritabanına gönderilir", () => {
  assert.match(
    adminSidebar,
    /await client[\s\S]{0,80}\.from\("admin_ui_preferences"\)[\s\S]{0,80}\.upsert\([\s\S]{0,220}activity_seen_at: next/,
  );
  assert.match(adminSidebar, /activitySeenStorageKey/);
  assert.doesNotMatch(
    adminSidebar,
    /void client[\s\S]{0,100}\.from\("admin_ui_preferences"\)/,
  );
});
