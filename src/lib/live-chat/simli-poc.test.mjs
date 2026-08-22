import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isSimliCallStatus,
  isTemporarySessionToken,
  safeTiming,
  SIMLI_AUDIO_STRATEGY,
  SIMLI_TRANSPORT,
} from "./simli.ts";
import { SIMLI_PCM_FORMAT } from "./simli-audio-input.ts";

const migration = await readFile(
  new URL(
    "../../../supabase/migrations/20260822111055_live_chat_simli_trinity_poc.sql",
    import.meta.url,
  ),
  "utf8",
);
const route = await readFile(
  new URL("../../app/api/live-chat/simli-session/route.ts", import.meta.url),
  "utf8",
);
const client = await readFile(
  new URL("../../components/live-chat/simli-video-avatar.tsx", import.meta.url),
  "utf8",
);
const audioInput = await readFile(
  new URL("./simli-audio-input.ts", import.meta.url),
  "utf8",
);
const customerCall = await readFile(
  new URL(
    "../../components/live-chat/customer-video-call.tsx",
    import.meta.url,
  ),
  "utf8",
);
const server = await readFile(
  new URL("./simli-server.ts", import.meta.url),
  "utf8",
);
const settingsRoute = await readFile(
  new URL(
    "../../app/api/admin/live-chat/video-settings/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const csp = await readFile(
  new URL("../../../next.config.ts", import.meta.url),
  "utf8",
);

test("Simli yalnız kabul edilmiş aktif çağrı durumlarında başlatılır", () => {
  for (const status of ["accepted", "connecting", "connected", "reconnecting"])
    assert.equal(isSimliCallStatus(status), true);
  for (const status of [
    "requesting",
    "ringing",
    "ended",
    "rejected",
    "missed",
    "failed",
  ])
    assert.equal(isSimliCallStatus(status), false);
});

test("diagnostic zamanları privacy-safe ve sınırlıdır", () => {
  assert.equal(safeTiming(12.6), 13);
  assert.equal(safeTiming(-4), 0);
  assert.equal(safeTiming(999_999), 120_000);
  assert.equal(safeTiming(Number.NaN), null);
  assert.equal(isTemporarySessionToken("short"), false);
  assert.equal(isTemporarySessionToken("x".repeat(32)), true);
});

test("PoC A LiveKit kullanır, resmi PCM girişini gönderir ve Simli sesini oynatmaz", () => {
  assert.equal(SIMLI_TRANSPORT, "livekit");
  assert.equal(SIMLI_AUDIO_STRATEGY, "pcm16-audio");
  assert.match(client, /audio\.muted = true/);
  assert.match(client, /audio\.volume = 0/);
  assert.match(client, /<audio ref=\{mutedAudioRef\} muted playsInline/);
  assert.match(client, /startSimliAudioInput/);
  assert.doesNotMatch(client, /listenToMediastreamTrack/);
  assert.match(audioInput, /client\.sendAudioData\(audioData\)/);
  assert.match(audioInput, /context\.resume\(\)/);
  assert.match(audioInput, /createMediaStreamSource/);
  assert.match(audioInput, /AudioWorkletNode/);
  assert.match(audioInput, /silentGain\.gain\.value = 0/);
  assert.match(client, /inputAudioTrack\.clone\(\)/);
  assert.match(
    customerCall,
    /<audio ref=\{remoteAudioRef\} autoPlay playsInline/,
  );
  assert.doesNotMatch(
    `${client}\n${audioInput}`,
    /getUserMedia|MediaRecorder|speechSynthesis/,
  );
  assert.match(client, /simli-client\/dist\/client\.js/);
  assert.doesNotMatch(client, /import\("simli-client"\)/);
});

test("Simli PCM akışı resmi 16 kHz mono PCM16 ve 6000-byte chunk formatındadır", () => {
  assert.deepEqual(SIMLI_PCM_FORMAT, {
    sampleRate: 16_000,
    channels: 1,
    bitsPerSample: 16,
    chunkBytes: 6_000,
  });
  assert.match(audioInput, /sampleRate \/ this\.targetRate/);
  assert.match(audioInput, /Math\.round\(sample \* 32767\)/);
});

test("Simli diagnostics gerçek input ve video akış sayaçlarını yayınlar", () => {
  for (const field of [
    "simliAudioSourceState",
    "simliAudioInputState",
    "simliInputLevelState",
    "simliAudioChunksSent",
    "simliAudioBytesSent",
    "simliAudioAckCount",
    "simliAvatarSource",
    "simliVideoFramesReceived",
    "simliVideoBytesReceived",
    "simliVideoPlaybackTimeMs",
  ])
    assert.match(client, new RegExp(field));
  assert.match(client, /getVideoPlaybackQuality/);
  assert.match(client, /srcObject instanceof MediaStream/);
});

test("session endpoint ownership, accepted-call, rate limit ve tek-session kilidi uygular", () => {
  assert.match(route, /visitor_token/);
  assert.match(route, /isSimliCallStatus\(authorized\.call\.status\)/);
  assert.match(route, /enforceLiveChatRateLimit/);
  assert.match(route, /reserve_live_chat_simli_session/);
  assert.match(route, /session_already_active/);
  assert.match(route, /touch_live_chat_simli_session/);
  assert.match(route, /release_live_chat_simli_session/);
  assert.match(migration, /for update/);
  assert.match(migration, /simli_session_expires_at > now\(\)/);
});

test("çağrı kapanınca Simli oturumu DB trigger ve client cleanup ile kapanır", () => {
  assert.match(migration, /before update of status on public\.live_chat_calls/);
  assert.match(migration, /'ended', 'rejected', 'missed', 'failed'/);
  assert.match(client, /simli-session[\s\S]*method: "DELETE"/);
  assert.match(client, /client\?\.stop\(\)/);
  assert.match(client, /clonedTrack\?\.stop\(\)/);
});

test("Simli hatası native çağrıyı düşürmeden static avatara döner", () => {
  assert.match(client, /StaticAvatarRenderer/);
  assert.match(client, /report\("failed", "waiting", "failed", true/);
  assert.doesNotMatch(client, /video-calls[\s\S]*action:\s*"fail"/);
  assert.match(customerCall, /settings\.avatar_mode === "simli-trinity"/);
});

test("API key sadece server dosyasında okunur ve kısa token browser'a verilir", () => {
  assert.match(server, /process\.env\.SIMLI_API_KEY/);
  assert.match(server, /"x-simli-api-key": config\.apiKey/);
  assert.doesNotMatch(client, /SIMLI_API_KEY|x-simli-api-key|faceId/);
  assert.doesNotMatch(route, /apiKey:\s*config\.apiKey/);
  assert.match(route, /sessionToken/);
});

test("config eksikse admin Simli modunu seçemez", () => {
  assert.match(settingsRoute, /payload\.avatarMode === "simli-trinity"/);
  assert.match(settingsRoute, /!publicSimliConfig\(\)\.simliConfigured/);
  assert.match(settingsRoute, /status[^\n]*409|409,/);
});

test("CSP yalnız gerekli Simli ve LiveKit uçlarını açar", () => {
  for (const domain of [
    "https://api.simli.ai",
    "wss://api.simli.ai",
    "https://*.livekit.cloud",
    "wss://*.livekit.cloud",
  ])
    assert.match(
      csp,
      new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  assert.match(csp, /media-src 'self' blob:/);
  assert.doesNotMatch(csp, /connect-src[^\n]*\s\*/);
});

test("mobil avatar playsInline kullanır ve küçük ekranda taşma oluşturmaz", () => {
  assert.match(client, /autoPlay[\s\S]*muted[\s\S]*playsInline/);
  assert.match(client, /overflow-hidden/);
  assert.match(customerCall, /w-\[min\(430px,calc\(100vw-24px\)\)\]/);
  assert.match(client, /Dijital Temsilci/);
});

test("migration yalnız additive değişiklik yapar ve RPC'leri service role ile sınırlar", () => {
  assert.match(migration, /add column if not exists simli_session_state/);
  assert.match(
    migration,
    /avatar_mode in \('static', 'audio-reactive', 'simli-trinity'\)/,
  );
  for (const fn of ["reserve", "touch", "release"])
    assert.match(
      migration,
      new RegExp(
        `revoke all on function public\\.${fn}_live_chat_simli_session[\\s\\S]*from public, anon, authenticated`,
      ),
    );
  assert.doesNotMatch(migration, /drop\s+table|truncate\s+table/i);
});
