import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../../supabase/migrations/20260821204028_live_chat_video_call_foundation.sql",
  import.meta.url,
);
const hardeningMigrationUrl = new URL(
  "../../../supabase/migrations/20260821212221_harden_live_chat_video_call_policies.sql",
  import.meta.url,
);

const sql = await readFile(migrationUrl, "utf8");
const hardeningSql = await readFile(hardeningMigrationUrl, "utf8");

test("migration additive çağrı, event, settings ve rate-limit tablolarını oluşturur", () => {
  for (const table of [
    "live_chat_calls",
    "live_chat_call_events",
    "live_chat_video_settings",
    "live_chat_call_rate_limits",
  ])
    assert.match(
      sql,
      new RegExp(`create table if not exists public\\.${table}`),
    );
  assert.doesNotMatch(sql, /drop\s+table|truncate\s+table/i);
});

test("tüm yeni public tablolarında RLS aktiftir", () => {
  for (const table of [
    "live_chat_calls",
    "live_chat_call_events",
    "live_chat_video_settings",
    "live_chat_call_rate_limits",
  ])
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
});

test("visitor ownership conversation visitor token ile sınırlandırılır", () => {
  assert.match(
    sql,
    /conversation\.visitor_token\s*=\s*public\.live_chat_request_token\(\)/,
  );
  assert.match(sql, /Visitors read own live chat calls/);
  assert.match(sql, /Visitors read own live chat call events/);
});

test("atomic accept ve admin busy veritabanı seviyesinde korunur", () => {
  assert.match(sql, /for update/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /live_chat_calls_one_active_admin_idx/);
  assert.match(sql, /call_already_taken/);
  assert.match(sql, /admin_busy/);
});

test("merkezi state fonksiyonları yalnız service_role tarafından çağrılabilir", () => {
  assert.match(
    sql,
    /revoke all on function public\.transition_live_chat_call[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    sql,
    /grant execute on function public\.transition_live_chat_call[\s\S]*to service_role/,
  );
  assert.match(
    sql,
    /grant execute on function public\.request_live_chat_call[\s\S]*to service_role/,
  );
});

test("private signaling call id, nonce, süre ve aktif state ile sınırlandırılır", () => {
  assert.match(sql, /on realtime\.messages for select to authenticated/);
  assert.match(sql, /on realtime\.messages for insert to authenticated/);
  assert.match(sql, /call\.signaling_nonce::text/);
  assert.match(sql, /call\.auth_expires_at > now\(\)/);
  assert.match(
    sql,
    /\(select realtime\.topic\(\)\) = 'call:' \|\| call\.id::text/,
  );
});

test("çağrı süre aşımı ve abandoned fallback kalıcı aktif kayıt bırakmaz", () => {
  assert.match(
    sql,
    /status in \('requesting', 'ringing'\)[\s\S]*expires_at <= now\(\)/,
  );
  assert.match(
    sql,
    /status in \('accepted', 'connecting', 'connected', 'reconnecting'\)[\s\S]*auth_expires_at <= now\(\)/,
  );
});

test("policy hardening JWT iddialarını tek kez değerlendirir ve FK indekslerini ekler", () => {
  assert.match(
    hardeningSql,
    /select current_setting\('request\.jwt\.claims', true\)/,
  );
  assert.match(hardeningSql, /live_chat_call_events_call_id_idx/);
  assert.match(hardeningSql, /live_chat_video_settings_updated_by_idx/);
  assert.match(
    hardeningSql,
    /Clients cannot access live chat call rate limits[\s\S]*using \(false\)/,
  );
  assert.doesNotMatch(hardeningSql, /drop\s+table|truncate\s+table/i);
});
