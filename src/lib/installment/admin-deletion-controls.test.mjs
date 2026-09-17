import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const applicationRoute = read(
  "../../app/api/admin/installment-applications/[id]/route.ts",
);
const installmentReceiptRoute = read(
  "../../app/api/admin/installment-payment-receipts/[receiptId]/route.ts",
);
const transferReceiptRoute = read(
  "../../app/api/admin/payment-receipts/[receiptId]/route.ts",
);
const customerRoute = read(
  "../../app/api/admin/customers/[customerId]/route.ts",
);
const orderRoute = read("../../app/api/admin/orders/[orderId]/route.ts");
const applicationUi = read(
  "../../components/admin/admin-installment-applications.tsx",
);
const customerUi = read("../../components/admin/admin-customers.tsx");
const orderUi = read("../../components/admin/admin-orders.tsx");
const receiptUi = read("../../components/admin/admin-payment-receipts.tsx");
const migration = read(
  "../../../supabase/migrations/20260916193538_cascade_installment_application_deletion.sql",
);

test("admin silme istekleri yetki ve kaynak kontrolünden geçer", () => {
  assert.match(applicationRoute, /sameOriginRequest\(request\)/);
  assert.match(installmentReceiptRoute, /sameOriginRequest\(request\)/);
  assert.match(transferReceiptRoute, /requireAdmin\(request\)/);
  assert.match(customerRoute, /requireAdmin\(request\)/);
  assert.match(orderRoute, /requireAdmin\(request\)/);
});

test("kritik silme işlemleri sunucu tarafında özel şifre ister", () => {
  for (const route of [
    applicationRoute,
    installmentReceiptRoute,
    transferReceiptRoute,
    customerRoute,
    orderRoute,
  ]) {
    assert.match(route, /requireAdminDeletionPassword/);
    assert.match(route, /body\.password/);
  }

  for (const ui of [applicationUi, customerUi, orderUi, receiptUi]) {
    assert.match(ui, /AdminDeletionPasswordDialog/);
    assert.doesNotMatch(
      ui,
      /kalıcı olarak silmek için[\s\S]{0,160}window\.prompt|window\.prompt[\s\S]{0,160}kalıcı olarak silmek için/i,
    );
  }
});

test("elden taksit başvurusu silinince iki özel dosya alanı da temizlenir", () => {
  assert.match(applicationRoute, /installment_application_documents/);
  assert.match(applicationRoute, /installment_payment_receipts/);
  assert.match(applicationRoute, /INSTALLMENT_STORAGE_BUCKET/);
  assert.match(applicationRoute, /PAYMENT_RECEIPTS_BUCKET/);
  assert.match(migration, /source_application_id[\s\S]*on delete cascade/i);
});

test("iki dekont türü de kayıt ve özel dosyayı siler", () => {
  for (const route of [installmentReceiptRoute, transferReceiptRoute]) {
    assert.match(route, /\.delete\(\)/);
    assert.match(route, /PAYMENT_RECEIPTS_BUCKET/);
    assert.match(route, /\.remove\(\[/);
  }
  assert.match(installmentReceiptRoute, /installment_customer_portals/);
  assert.match(installmentReceiptRoute, /down_payment_pending/);
});

test("müşteri silme yönetici hesabını korur ve iş kayıtlarını tutar", () => {
  assert.match(customerRoute, /app_metadata\.role === "admin"/);
  assert.match(customerRoute, /deleteUser\([\s\S]*true/);
  assert.doesNotMatch(customerRoute, /from\("orders"\)\.delete/);
});
