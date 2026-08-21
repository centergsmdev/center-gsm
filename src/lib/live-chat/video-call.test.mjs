import assert from "node:assert/strict";
import test from "node:test";

import {
  SignalReplayGuard,
  createSignalEnvelope,
  formatCallDuration,
  isValidCallTransition,
} from "./video-call.ts";
import {
  ADMIN_MEDIA_CONSTRAINTS,
  assertAdminPeerHasNoVideoSender,
  requestAdminMedia,
  requestCustomerMedia,
} from "./video-media.ts";
import {
  signCallParticipantJwt,
  verifyCallParticipantJwt,
} from "./video-token.ts";

const CALL_ID = "4c41d72b-c880-48ff-8d91-b694f4b9186f";

test("state machine yalnız izin verilen çağrı geçişlerini kabul eder", () => {
  assert.equal(isValidCallTransition("ringing", "accept"), true);
  assert.equal(isValidCallTransition("ringing", "reject"), true);
  assert.equal(isValidCallTransition("connected", "accept"), false);
  assert.equal(isValidCallTransition("accepted", "connecting"), true);
  assert.equal(isValidCallTransition("connecting", "connected"), true);
  assert.equal(isValidCallTransition("connected", "reconnecting"), true);
  assert.equal(isValidCallTransition("ended", "connected"), false);
});

test("signal envelope çağrı, rol, sıra, nonce ve zaman bilgisini taşır", () => {
  const envelope = createSignalEnvelope({
    callId: CALL_ID,
    sender: "customer",
    sequence: 1,
    data: { type: "offer" },
    now: 10_000,
    nonce: "4fc84e1b-5dd1-4a8d-b3eb-3e8963fb7fa0",
  });
  assert.equal(envelope.callId, CALL_ID);
  assert.equal(envelope.sender, "customer");
  assert.equal(envelope.sequence, 1);
  assert.equal(envelope.timestamp, 10_000);
});

test("replay guard aynı nonce veya sequence değerini ikinci kez kabul etmez", () => {
  const guard = new SignalReplayGuard();
  const envelope = createSignalEnvelope({
    callId: CALL_ID,
    sender: "customer",
    sequence: 1,
    data: {},
    now: 20_000,
  });
  assert.equal(
    guard.accept(envelope, {
      callId: CALL_ID,
      sender: "customer",
      now: 20_001,
    }),
    true,
  );
  assert.equal(
    guard.accept(envelope, {
      callId: CALL_ID,
      sender: "customer",
      now: 20_002,
    }),
    false,
  );
});

test("replay guard yanlış call, yanlış rol ve stale mesajı reddeder", () => {
  const envelope = createSignalEnvelope({
    callId: CALL_ID,
    sender: "customer",
    sequence: 1,
    data: {},
    now: 50_000,
  });
  assert.equal(
    new SignalReplayGuard().accept(envelope, {
      callId: crypto.randomUUID(),
      sender: "customer",
      now: 50_000,
    }),
    false,
  );
  assert.equal(
    new SignalReplayGuard().accept(envelope, {
      callId: CALL_ID,
      sender: "admin",
      now: 50_000,
    }),
    false,
  );
  assert.equal(
    new SignalReplayGuard().accept(envelope, {
      callId: CALL_ID,
      sender: "customer",
      now: 90_001,
    }),
    false,
  );
});

test("müşteri kamera hatasında audio-only akışa düşer", async () => {
  const audioStream = { id: "audio" };
  const calls = [];
  const result = await requestCustomerMedia(async (constraints) => {
    calls.push(constraints);
    if (calls.length === 1) throw new Error("camera_denied");
    return audioStream;
  });
  assert.equal(result.stream, audioStream);
  assert.equal(result.audioOnly, true);
  assert.equal(calls[1].video, false);
});

test("müşteri mikrofon da reddedilirse kontrollü hata üst katmana taşınır", async () => {
  await assert.rejects(
    requestCustomerMedia(async () => {
      throw new Error("permission_denied");
    }),
    /permission_denied/,
  );
});

test("admin medya isteği video false constraint kullanır", async () => {
  let received;
  const stream = {
    getVideoTracks: () => [],
    getTracks: () => [],
  };
  const result = await requestAdminMedia(async (constraints) => {
    received = constraints;
    return stream;
  });
  assert.equal(result, stream);
  assert.deepEqual(received, ADMIN_MEDIA_CONSTRAINTS);
  assert.equal(received.video, false);
});

test("admin stream içinde video track bulunursa reddedilir ve track durdurulur", async () => {
  let stopped = false;
  const video = { kind: "video", stop: () => (stopped = true) };
  await assert.rejects(
    requestAdminMedia(async () => ({
      getVideoTracks: () => [video],
      getTracks: () => [video],
    })),
    /admin_video_track_forbidden/,
  );
  assert.equal(stopped, true);
});

test("admin peer sender listesinde video track bulunamaz", () => {
  assert.doesNotThrow(() =>
    assertAdminPeerHasNoVideoSender({
      getSenders: () => [{ track: { kind: "audio" } }],
    }),
  );
  assert.throws(
    () =>
      assertAdminPeerHasNoVideoSender({
        getSenders: () => [{ track: { kind: "video" } }],
      }),
    /admin_video_sender_forbidden/,
  );
});

test("çağrı süresi kullanıcıya okunabilir biçimde gösterilir", () => {
  assert.equal(formatCallDuration(42), "42 sn");
  assert.equal(formatCallDuration(125), "2 dk 5 sn");
});

test("kısa süreli call JWT doğru çağrıya bağlıdır ve süresi dolunca reddedilir", () => {
  const secret = "test-secret-that-is-long-enough";
  const token = signCallParticipantJwt({
    secret,
    subject: crypto.randomUUID(),
    callId: CALL_ID,
    callNonce: "4fc84e1b-5dd1-4a8d-b3eb-3e8963fb7fa0",
    callRole: "customer",
    issuedAt: 100,
    expiresAt: 160,
  });
  const claims = verifyCallParticipantJwt(token, secret, 159);
  assert.equal(claims?.call_id, CALL_ID);
  assert.equal(claims?.call_role, "customer");
  assert.equal(verifyCallParticipantJwt(token, secret, 160), null);
  assert.equal(verifyCallParticipantJwt(token, "wrong-secret", 120), null);
});
