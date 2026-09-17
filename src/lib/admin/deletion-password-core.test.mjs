import assert from "node:assert/strict";
import test from "node:test";

import {
  hashAdminDeletionPassword,
  verifyAdminDeletionPassword,
} from "./deletion-password-core.ts";

test("silme şifresi tek yönlü ve rastgele tuzla saklanır", () => {
  const password = "Sadece-Sahip-2026!";
  const first = hashAdminDeletionPassword(password);
  const second = hashAdminDeletionPassword(password);

  assert.notEqual(first, second);
  assert.doesNotMatch(first, new RegExp(password));
  assert.equal(verifyAdminDeletionPassword(password, first), true);
  assert.equal(verifyAdminDeletionPassword("yanlis-sifre", first), false);
});

test("kısa silme şifreleri kabul edilmez", () => {
  assert.throws(() => hashAdminDeletionPassword("kisa"), /12-128 karakter/);
});
