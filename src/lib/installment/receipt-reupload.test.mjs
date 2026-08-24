import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260824085638_allow_installment_receipt_reupload.sql",
    import.meta.url,
  ),
  "utf8",
);
const uploadRoute = readFileSync(
  new URL("../../app/elden-taksit/takip/[id]/dekont/route.ts", import.meta.url),
  "utf8",
);
const receiptComponent = readFileSync(
  new URL(
    "../../components/installment/portal-receipt-upload.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("yeni dekont eski aktif dekontu silmeden arşivler", () => {
  assert.match(
    migration,
    /set superseded_at = timezone\('utc', now\(\)\)[\s\S]*and superseded_at is null/,
  );
  assert.match(
    migration,
    /create unique index installment_payment_receipts_one_active_portal_idx[\s\S]*and superseded_at is null/,
  );
  assert.doesNotMatch(
    migration,
    /delete from public\.installment_payment_receipts/,
  );
});

test("dekont değişimi kısa ve atomik bir veritabanı işlemiyle yapılır", () => {
  assert.match(
    migration,
    /select \* into v_portal[\s\S]*for update;[\s\S]*update public\.installment_payment_receipts[\s\S]*insert into public\.installment_payment_receipts/,
  );
  assert.match(
    migration,
    /revoke all on function public\.replace_installment_payment_receipt[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.replace_installment_payment_receipt[\s\S]*to service_role/,
  );
  assert.match(uploadRoute, /rpc\("replace_installment_payment_receipt"/);
});

test("müşteri ödeme aşamasında her durumdan yeni dekont seçebilir", () => {
  assert.match(
    receiptComponent,
    /stage === "down_payment_pending"[\s\S]*stage === "payment_under_review"[\s\S]*stage === "payment_confirmed"/,
  );
  assert.match(receiptComponent, /Yeni Dekont Yükle/);
  assert.match(
    receiptComponent,
    /stage === "payment_under_review"[\s\S]*title="Peşinat kontrol ediliyor"/,
  );
});
