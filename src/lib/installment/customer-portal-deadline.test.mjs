import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { portalPaymentTimeRemaining } from "./customer-portal-deadline.ts";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260824080743_installment_payment_deadline_enforcement.sql",
    import.meta.url,
  ),
  "utf8",
);

test("peşinat geri sayımı kalan zamanı gün, saat, dakika ve saniyeye böler", () => {
  const now = Date.UTC(2026, 7, 24, 9, 0, 0);
  const remaining = portalPaymentTimeRemaining(
    new Date(now + 90_061_000).toISOString(),
    now,
  );
  assert.deepEqual(remaining, {
    expired: false,
    totalSeconds: 90_061,
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
  });
});

test("süresi dolan geri sayım negatif değer üretmez", () => {
  const now = Date.UTC(2026, 7, 24, 9, 0, 0);
  assert.deepEqual(
    portalPaymentTimeRemaining(new Date(now - 1).toISOString(), now),
    {
      expired: true,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
  );
});

test("süre aşımı yalnız peşinat bekleyen ve geçerli dekontu olmayan portalları iptal eder", () => {
  assert.match(
    migration,
    /portal\.stage = 'down_payment_pending'[\s\S]*portal\.payment_due_at <= now\(\)/,
  );
  assert.match(
    migration,
    /not exists[\s\S]*receipt\.status in \('pending_review', 'approved'\)/,
  );
  assert.match(
    migration,
    /application\.status = 'approved'[\s\S]*set status = 'cancelled'/,
  );
});

test("yeniden başvuru engeli yalnız servis rolü üzerinden uygulanır", () => {
  assert.match(
    migration,
    /alter table public\.installment_application_blocks force row level security/,
  );
  assert.match(
    migration,
    /revoke all on function public\.expire_overdue_installment_portals\(uuid, text\)[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.expire_overdue_installment_portals\(uuid, text\)[\s\S]*to service_role/,
  );
});
