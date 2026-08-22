import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { relatedSignalReasons, selectMatchingBlock } from "./block-policy.ts";

const visitorA = "11111111-1111-4111-8111-111111111111";
const visitorB = "22222222-2222-4222-8222-222222222222";
const baseIdentity = {
  visitorToken: visitorA,
  userId: null,
  abuseTokenHash: "a".repeat(64),
  ipHash: "b".repeat(64),
  isAdmin: false,
};
const permanentChatBlock = {
  id: "block-a",
  scope: "chat",
  visitor_token: visitorA,
  user_id: null,
  abuse_token_hash: "a".repeat(64),
  ip_hash: "b".repeat(64),
  expires_at: null,
  revoked_at: null,
};

test("isim değişikliği identity kararını etkilemez; aynı visitor engelli kalır", () => {
  assert.equal(
    selectMatchingBlock([permanentChatBlock], {
      ...baseIdentity,
      ipHash: "c".repeat(64),
    })?.matchedBy,
    "visitor",
  );
});

test("aynı abuse token yeni visitor ile engeli aşamaz", () => {
  assert.equal(
    selectMatchingBlock([permanentChatBlock], {
      ...baseIdentity,
      visitorToken: visitorB,
      ipHash: "c".repeat(64),
    })?.matchedBy,
    "abuse_token",
  );
});

test("aynı ağdaki yeni visitor yalnız canlı destek IP engelinden etkilenir", () => {
  const identity = {
    ...baseIdentity,
    visitorToken: visitorB,
    abuseTokenHash: "c".repeat(64),
  };
  assert.equal(
    selectMatchingBlock([permanentChatBlock], identity)?.matchedBy,
    "network",
  );
  const siteBlock = { ...permanentChatBlock, id: "site", scope: "site" };
  assert.equal(selectMatchingBlock([siteBlock], identity, "site"), null);
});

test("authenticated user farklı visitor, device ve IP ile engelli kalır", () => {
  const block = { ...permanentChatBlock, user_id: "user-a" };
  assert.equal(
    selectMatchingBlock([block], {
      visitorToken: visitorB,
      userId: "user-a",
      abuseTokenHash: "c".repeat(64),
      ipHash: "d".repeat(64),
      isAdmin: false,
    })?.matchedBy,
    "user",
  );
});

test("süresi dolan ve kaldırılan engeller etkisiz, permanent engel aktiftir", () => {
  const expired = {
    ...permanentChatBlock,
    id: "expired",
    expires_at: "2026-01-01T00:00:00.000Z",
  };
  const revoked = {
    ...permanentChatBlock,
    id: "revoked",
    revoked_at: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(
    selectMatchingBlock([expired], baseIdentity, "chat", Date.UTC(2026, 7, 22)),
    null,
  );
  assert.equal(selectMatchingBlock([revoked], baseIdentity), null);
  assert.equal(
    selectMatchingBlock([permanentChatBlock], baseIdentity)?.block.id,
    "block-a",
  );
});

test("admin/internal hesaplar block resolver tarafından etkilenmez", () => {
  assert.equal(
    selectMatchingBlock([permanentChatBlock], {
      ...baseIdentity,
      isAdmin: true,
    }),
    null,
  );
});

test("ilişkili sohbet sinyalleri isimden bağımsız sınıflandırılır", () => {
  const reasons = relatedSignalReasons(
    {
      visitor_token: visitorA,
      user_id: "user-a",
      abuse_token_hash: "a".repeat(64),
      ip_hash: "b".repeat(64),
      device_profile_hash: "c".repeat(64),
    },
    {
      visitor_token: visitorB,
      user_id: "user-a",
      abuse_token_hash: "a".repeat(64),
      ip_hash: "b".repeat(64),
      device_profile_hash: "c".repeat(64),
    },
  );
  assert.deepEqual(reasons, [
    "user",
    "abuse_token",
    "network",
    "coarse_device",
  ]);
});

const migration = await readFile(
  new URL(
    "../../../supabase/migrations/20260822005255_live_chat_abuse_protection.sql",
    import.meta.url,
  ),
  "utf8",
);
const messageRoute = await readFile(
  new URL("../../app/api/live-chat/route.ts", import.meta.url),
  "utf8",
);
const imageRoute = await readFile(
  new URL("../../app/api/live-chat/upload/route.ts", import.meta.url),
  "utf8",
);
const videoRoute = await readFile(
  new URL("../../app/api/live-chat/video-calls/route.ts", import.meta.url),
  "utf8",
);
const aiRoute = await readFile(
  new URL("../../app/api/live-chat/ai/route.ts", import.meta.url),
  "utf8",
);
const adminSecurity = await readFile(
  new URL(
    "../../components/admin/admin-live-chat-security.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("migration additive tablolar, RLS, audit ve hash-at-rest sınırlarını kurar", () => {
  for (const table of [
    "live_chat_abuse_identities",
    "live_chat_blocks",
    "live_chat_rate_limit_events",
  ]) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${table}`),
    );
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
  }
  assert.doesNotMatch(migration, /drop\s+table|truncate\s+table/i);
  assert.match(
    migration,
    /revoke insert on public\.live_chat_conversations from anon/,
  );
  assert.match(
    migration,
    /revoke insert on public\.live_chat_messages from anon/,
  );
  assert.match(
    migration,
    /grant execute on function public\.consume_live_chat_rate_limit[\s\S]*to service_role/,
  );
  assert.match(migration, /live_chat_site_block_strong_identity/);
  assert.match(migration, /live_chat\.block_created/);
  assert.match(migration, /live_chat\.block_revoked/);
  assert.doesNotMatch(migration, /\bip_address\s+inet\b/i);
});

test("mesaj, conversation, görsel, video ve AI aynı merkezi block sınırını kullanır", () => {
  for (const source of [messageRoute, imageRoute, videoRoute, aiRoute])
    assert.match(source, /resolveLiveChatBlock/);
  assert.match(messageRoute, /conversation_create/);
  assert.match(messageRoute, /message_send/);
  assert.match(imageRoute, /image_upload/);
  assert.match(videoRoute, /video_request/);
  assert.match(
    aiRoute,
    /if \(\(await resolveLiveChatBlock[\s\S]*return quiet\(\)/,
  );
});

test("admin IP paylaşımı uyarısı, süreli engel, neden ve unblock aksiyonunu gösterir", () => {
  assert.match(adminSecurity, /Aynı internet bağlantısını kullanan/);
  assert.match(adminSecurity, /başka kişiler de bu engelden/);
  assert.match(adminSecurity, /etkilenebilir/);
  assert.match(adminSecurity, /1 saat/);
  assert.match(adminSecurity, /24 saat/);
  assert.match(adminSecurity, /7 gün/);
  assert.match(adminSecurity, /Süresiz/);
  assert.match(adminSecurity, /Engeli Kaldır/);
  assert.match(adminSecurity, /Muhtemelen ilişkili/);
});

test("gizlilik sınırı agresif fingerprinting kullanmaz", async () => {
  const shared = await readFile(
    new URL("./abuse-shared.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    shared,
    /canvas|getImageData|AudioContext|enumerateDevices|fonts|webgl/i,
  );
  assert.match(shared, /browserFamily/);
  assert.match(shared, /viewportClass/);
  assert.match(shared, /timezone/);
  assert.match(shared, /language/);
});
