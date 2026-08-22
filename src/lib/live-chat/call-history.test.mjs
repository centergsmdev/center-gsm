import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildChatTimeline,
  callHistoryDurationSeconds,
  callHistoryOutcome,
} from "./call-history.ts";

const baseCall = {
  id: "call-1",
  conversation_id: "conversation-1",
  status: "ended",
  accepted_by: null,
  signaling_nonce: "nonce",
  revision: 1,
  requested_at: "2026-08-22T10:00:00.000Z",
  accepted_at: "2026-08-22T10:00:05.000Z",
  connecting_at: "2026-08-22T10:00:06.000Z",
  connected_at: "2026-08-22T10:00:10.900Z",
  ended_at: "2026-08-22T10:02:15.100Z",
  expires_at: "2026-08-22T10:01:00.000Z",
  auth_expires_at: "2026-08-22T11:00:00.000Z",
  duration_seconds: 999,
  ended_by: "admin",
  end_reason: null,
  simli_session_state: null,
  simli_session_attempt_id: null,
  simli_session_started_at: null,
  simli_session_ended_at: null,
  simli_session_expires_at: null,
  created_at: "2026-08-22T10:00:00.000Z",
  updated_at: "2026-08-22T10:02:15.100Z",
};

test("cevaplanan görüşme süresi yalnız server connected_at ve ended_at ile hesaplanır", () => {
  assert.equal(callHistoryOutcome(baseCall), "answered");
  assert.equal(callHistoryDurationSeconds(baseCall), 124);
});

test("cevapsız, reddedilen, başarısız ve müşteri iptali ayrıştırılır", () => {
  assert.equal(callHistoryOutcome({ ...baseCall, status: "missed" }), "missed");
  assert.equal(
    callHistoryOutcome({ ...baseCall, status: "rejected" }),
    "rejected",
  );
  assert.equal(callHistoryOutcome({ ...baseCall, status: "failed" }), "failed");
  assert.equal(
    callHistoryOutcome({
      ...baseCall,
      connected_at: null,
      status: "ended",
      ended_by: "customer",
    }),
    "cancelled",
  );
});

test("mesajlar ve birden fazla görüşme server zamanına göre tek akışta sıralanır", () => {
  const timeline = buildChatTimeline(
    [
      {
        id: "message-1",
        conversation_id: "conversation-1",
        sender: "customer",
        body: "Merhaba",
        attachment_path: null,
        attachment_name: null,
        attachment_type: null,
        read_at: null,
        created_at: "2026-08-22T10:01:00.000Z",
      },
    ],
    [
      baseCall,
      {
        ...baseCall,
        id: "call-2",
        status: "ringing",
        requested_at: "2026-08-22T09:59:00.000Z",
        connected_at: null,
        ended_at: null,
      },
    ],
  );
  assert.deepEqual(
    timeline.map((entry) => entry.id),
    ["call:call-2", "message:message-1", "call:call-1"],
  );
});

test("admin ve müşteri zaman akışları kalıcı çağrı kartını kullanır", async () => {
  const [admin, customer, publicRoute, adminRoute] = await Promise.all([
    readFile(
      new URL("../../components/admin/admin-live-chat.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../../components/live-chat/live-chat-widget.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../../app/api/live-chat/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../../app/api/admin/live-chat/video-calls/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.match(admin, /buildChatTimeline\(messages, callHistory\)/);
  assert.match(admin, /CallHistoryCard call=\{entry\.call\} audience="admin"/);
  assert.match(customer, /CallHistoryCard call=\{entry\.call\} audience="customer"/);
  assert.match(customer, /event: "call_timeline"/);
  assert.match(publicRoute, /from\("live_chat_calls"\)/);
  assert.match(adminRoute, /historyCalls/);
});

test("müşterinin yerel kamera önizlemesi doğal yönde, admin uzak videosu değişmeden kalır", async () => {
  const [customerVideo, adminVideo] = await Promise.all([
    readFile(
      new URL(
        "../../components/live-chat/customer-video-call.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../../components/admin/admin-video-calls.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(
    customerVideo,
    /ref=\{selfVideoRef\}[\s\S]*?playsInline[\s\S]*?style=\{\{ transform: "none" \}\}/,
  );
  assert.doesNotMatch(adminVideo, /scaleX\(-1\)|-scale-x-100/);
});
