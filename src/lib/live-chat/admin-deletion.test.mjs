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
