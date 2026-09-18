import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const singleRoute = read(
  "../../app/api/admin/live-chat/[conversationId]/route.ts",
);
const allRoute = read("../../app/api/admin/live-chat/route.ts");
const adminUi = read("../../components/admin/admin-live-chat.tsx");
const adminUiStyles = read("../../components/admin/admin-live-chat.module.css");
const starredMigration = read(
  "../../../supabase/migrations/20260918130750_add_live_chat_starred_flag.sql",
);

test("tek sohbet silme özel şifre ve yönetici kaynak kontrolü ister", () => {
  assert.match(singleRoute, /requireAdmin\(request\)/);
  assert.match(singleRoute, /requireAdminDeletionPassword/);
  assert.match(singleRoute, /body\.password/);
  assert.match(singleRoute, /live_chat_conversations/);
  assert.match(singleRoute, /live-chat-images/);
});

test("tüm sohbetleri silme de aynı özel şifreyle korunur", () => {
  assert.match(allRoute, /requireAdmin\(request\)/);
  assert.match(allRoute, /requireAdminDeletionPassword/);
  assert.match(allRoute, /body\.password/);
  assert.match(allRoute, /\.delete\(\)[\s\S]*\.not\("id", "is", null\)/);
  assert.match(allRoute, /deletedCount/);
  assert.match(allRoute, /live-chat-images/);
});

test("canlı destek arayüzü tekli ve toplu silmede şifre penceresini kullanır", () => {
  assert.match(adminUi, /AdminDeletionPasswordDialog/);
  assert.match(adminUi, /Tüm sohbetleri sil/);
  assert.match(adminUi, /kind: "single"/);
  assert.match(adminUi, /kind: "all"/);
  assert.match(adminUi, /JSON\.stringify\(\{ password \}\)/);
  assert.doesNotMatch(adminUi, /window\.prompt/);
});

test("canlı destek çalışma alanı gerçek tam ekran moduna girip çıkabilir", () => {
  assert.match(adminUi, /requestFullscreen\(\)/);
  assert.match(adminUi, /document\.exitFullscreen\(\)/);
  assert.match(adminUi, /fullscreenchange/);
  assert.match(adminUi, /Tam ekran/);
  assert.match(adminUi, /Tam ekrandan çık/);
});

test("canlı destek koyu görünümü kalıcı olarak açıp kapatabilir", () => {
  assert.match(adminUi, /LIVE_CHAT_THEME_STORAGE_KEY/);
  assert.match(adminUi, /window\.localStorage\.setItem/);
  assert.match(adminUi, /Koyu görünüm/);
  assert.match(adminUi, /Açık görünüm/);
  assert.match(adminUi, /styles\.darkPanel/);
  assert.match(adminUiStyles, /\.darkPanel/);
});

test("önemli sohbet yıldızı veritabanında saklanır ve satırı sarı yapar", () => {
  assert.match(starredMigration, /add column if not exists is_starred boolean/);
  assert.match(adminUi, /update\(\{ is_starred: nextStarred \}\)/);
  assert.match(adminUi, /styles\.starredConversation/);
  assert.match(adminUi, /bg-amber-200/);
  assert.match(adminUi, /Önemli sohbet/);
  assert.match(adminUiStyles, /\.starredConversation/);
});
