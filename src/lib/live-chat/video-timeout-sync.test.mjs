import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL(
    "../../../supabase/migrations/20260822115905_live_chat_timeout_terminal_sync.sql",
    import.meta.url,
  ),
  "utf8",
);
const foundation = await readFile(
  new URL(
    "../../../supabase/migrations/20260821204028_live_chat_video_call_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const customer = await readFile(
  new URL(
    "../../components/live-chat/customer-video-call.tsx",
    import.meta.url,
  ),
  "utf8",
);
const widget = await readFile(
  new URL("../../components/live-chat/live-chat-widget.tsx", import.meta.url),
  "utf8",
);
const admin = await readFile(
  new URL("../../components/admin/admin-video-calls.tsx", import.meta.url),
  "utf8",
);
const peer = await readFile(
  new URL("../../components/live-chat/use-video-call-peer.ts", import.meta.url),
  "utf8",
);
const server = await readFile(
  new URL("./video-server.ts", import.meta.url),
  "utf8",
);

test("cevapsız çağrı etkin production ayarı ve server cron ile 30 saniyede missed olur", () => {
  assert.match(server, /ring_timeout_seconds:\s*30/);
  assert.match(migration, /set ring_timeout_seconds = 30/);
  assert.match(migration, /'center-gsm-expire-live-chat-calls'/);
  assert.match(migration, /'1 second'/);
  assert.match(migration, /select public\.expire_live_chat_calls\(\)/);
  assert.match(
    foundation,
    /status in \('requesting', 'ringing'\)[\s\S]*expires_at <= now\(\)[\s\S]*status = 'missed'/,
  );
});

test("29. saniyedeki kabul geçerli, 30 saniye sonrası kabul atomik olarak reddedilir", () => {
  const lockIndex = foundation.indexOf("for update;");
  const expiryIndex = foundation.indexOf(
    "v_call.status in ('requesting', 'ringing') and v_call.expires_at <= now()",
  );
  const acceptIndex = foundation.indexOf("if p_action = 'accept' then");
  assert.ok(
    lockIndex >= 0 && expiryIndex > lockIndex && acceptIndex > expiryIndex,
  );
  assert.match(
    foundation,
    /return jsonb_build_object\('ok', false, 'error', 'call_expired'/,
  );
  assert.match(foundation, /v_call\.status <> 'ringing'/);
});

test("cron veya admin kaynaklı terminal durum müşteriye DB broadcast ile anında iletilir", () => {
  assert.match(migration, /after update of status on public\.live_chat_calls/);
  assert.match(migration, /when \(old\.status is distinct from new\.status\)/);
  assert.match(migration, /perform realtime\.send\(/);
  assert.match(migration, /'call_timeline'/);
  assert.match(migration, /'live-chat:' \|\| v_visitor_token/);
  assert.match(widget, /event: "call_timeline"/);
  assert.match(widget, /callHistory=\{callHistory\}/);
  assert.match(
    customer,
    /callHistory\.find\(\(item\) => item\.id === current\.id\)/,
  );
});

test("admin ve müşteri kapatma işlemi sinyal ile DB geçişini paralel başlatıp medyayı hemen temizler", () => {
  for (const source of [admin, customer]) {
    assert.match(source, /if \(ending\) return/);
    assert.match(source, /peer\.sendHangup\(\)\.catch/);
    assert.match(source, /cleanupMedia\(\);[\s\S]*Promise\.allSettled/);
    assert.match(source, /\.pause\(\);[\s\S]*\.srcObject = null/);
    assert.match(source, /stopMediaStream\(localStreamRef\.current\)/);
    assert.match(source, /stopMediaStream\(remoteStreamRef\.current\)/);
  }
  assert.match(peer, /if \(event === "hangup"\)[\s\S]*onHangup\(\)/);
  assert.match(peer, /peer\.close\(\)/);
  assert.match(peer, /client\.removeChannel\(channel\)/);
});

test("çift kapatma terminal geçişte idempotent kalır ve tek event üretir", () => {
  const terminalGuard = foundation.indexOf(
    "if v_call.status in ('ended', 'rejected', 'missed', 'failed') then",
  );
  const eventInsert = foundation.indexOf(
    "insert into public.live_chat_call_events",
    terminalGuard,
  );
  assert.ok(terminalGuard >= 0 && eventInsert > terminalGuard);
  assert.match(
    foundation.slice(terminalGuard, eventInsert),
    /return jsonb_build_object\('ok', true, 'call', to_jsonb\(v_call\)\)/,
  );
});

test("müşteri terminal ekranları açık mesaj, gerçek süre ve yeni çağrı için temiz başlangıç sunar", () => {
  for (const message of [
    "Görüntülü görüşme talebiniz yanıtlanamadı.",
    "Görüntülü görüşme talebiniz şu anda kabul edilemedi.",
    "Görüntülü görüşme sona erdi.",
    "Canlı Desteğe Dön",
    "Yazılı Desteğe Dön",
  ])
    assert.ok(customer.includes(message));
  assert.match(customer, /callHistoryDurationSeconds\(call\)/);
  assert.match(customer, /setCall\(null\)/);
  assert.match(customer, /setParticipantToken\(null\)/);
  assert.match(customer, /setIceServers\(\[\]\)/);
  assert.match(customer, /style=\{\{ transform: "none" \}\}/);
});
