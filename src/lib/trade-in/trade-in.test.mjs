import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const migration = read(
  "supabase/migrations/20260916141633_trade_in_applications.sql",
);
const publicRoute = read("src/app/api/trade-in/route.ts");
const form = read("src/components/trade-in/trade-in-application.tsx");

test("takas kayıtları ve fotoğrafları ayrı, private yapılarda tutulur", () => {
  assert.match(migration, /create table public\.trade_in_applications/i);
  assert.match(migration, /create table public\.trade_in_photos/i);
  assert.match(
    migration,
    /'trade-in-private'[\s\S]*?false[\s\S]*?array\['image\/webp'\]/i,
  );
  assert.match(
    migration,
    /alter table public\.trade_in_applications force row level security/i,
  );
  assert.match(
    migration,
    /revoke all on public\.trade_in_applications from public, anon, authenticated/i,
  );
});

test("anonim istemci tabloya doğrudan yazamaz ve rate limit service role ile tüketilir", () => {
  assert.match(
    migration,
    /revoke all on function public\.consume_trade_in_rate_limit[\s\S]*?from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.consume_trade_in_rate_limit[\s\S]*?to service_role/i,
  );
  assert.match(publicRoute, /consume_trade_in_rate_limit/);
  assert.match(publicRoute, /isTradeInSameOrigin/);
});

test("form otomatik fiyat vaadi vermez ve 2-4 fotoğraf ister", () => {
  assert.doesNotMatch(form, /tahmini takas fiyatı/i);
  assert.match(form, /Kesin teklif fiziksel\s+inceleme sonrası netleşir/i);
  assert.match(form, /2–4 adet/);
  assert.match(publicRoute, /TRADE_IN_MIN_PHOTOS/);
  assert.match(publicRoute, /TRADE_IN_MAX_PHOTOS/);
});

test("takas başvurusu mevcut satış ve stok akışına bağlanmaz", () => {
  assert.doesNotMatch(
    migration,
    /references public\.(orders|inventory|inventory_reservations)/i,
  );
  assert.doesNotMatch(
    publicRoute,
    /from\("(orders|inventory|inventory_reservations)"\)/i,
  );
});
