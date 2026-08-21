import type { LiveChatCallStatus } from "@/types/database";

export type VideoCallRole = "customer" | "admin";
export type VideoCallAction =
  | "accept"
  | "reject"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "end"
  | "fail";

export type SignalEvent =
  | "offer"
  | "answer"
  | "ice-candidate"
  | "ice-restart"
  | "hangup"
  | "peer-ready";

export type SignalEnvelope<T = unknown> = {
  callId: string;
  sender: VideoCallRole;
  sequence: number;
  nonce: string;
  timestamp: number;
  data: T;
};

export const ACTIVE_CALL_STATUSES = new Set<LiveChatCallStatus>([
  "requesting",
  "ringing",
  "accepted",
  "connecting",
  "connected",
  "reconnecting",
]);

export const TERMINAL_CALL_STATUSES = new Set<LiveChatCallStatus>([
  "ended",
  "rejected",
  "missed",
  "failed",
]);

const MAX_SIGNAL_AGE_MS = 30_000;

export function createSignalEnvelope<T>(input: {
  callId: string;
  sender: VideoCallRole;
  sequence: number;
  data: T;
  now?: number;
  nonce?: string;
}): SignalEnvelope<T> {
  return {
    callId: input.callId,
    sender: input.sender,
    sequence: input.sequence,
    nonce: input.nonce ?? crypto.randomUUID(),
    timestamp: input.now ?? Date.now(),
    data: input.data,
  };
}

export class SignalReplayGuard {
  private readonly seenNonces = new Set<string>();
  private lastSequence = 0;

  accept(
    value: unknown,
    expected: { callId: string; sender: VideoCallRole; now?: number },
  ): value is SignalEnvelope {
    if (!isSignalEnvelope(value)) return false;
    const now = expected.now ?? Date.now();
    if (value.callId !== expected.callId || value.sender !== expected.sender)
      return false;
    if (Math.abs(now - value.timestamp) > MAX_SIGNAL_AGE_MS) return false;
    if (value.sequence <= this.lastSequence || this.seenNonces.has(value.nonce))
      return false;
    this.lastSequence = value.sequence;
    this.seenNonces.add(value.nonce);
    if (this.seenNonces.size > 256) {
      const oldest = this.seenNonces.values().next().value;
      if (oldest) this.seenNonces.delete(oldest);
    }
    return true;
  }
}

export function isSignalEnvelope(value: unknown): value is SignalEnvelope {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<SignalEnvelope>;
  return (
    typeof input.callId === "string" &&
    (input.sender === "customer" || input.sender === "admin") &&
    Number.isSafeInteger(input.sequence) &&
    Number(input.sequence) > 0 &&
    typeof input.nonce === "string" &&
    /^[0-9a-f-]{36}$/i.test(input.nonce) &&
    Number.isFinite(input.timestamp)
  );
}

export function isValidCallTransition(
  status: LiveChatCallStatus,
  action: VideoCallAction,
) {
  if (action === "accept" || action === "reject") return status === "ringing";
  if (action === "connecting")
    return status === "accepted" || status === "reconnecting";
  if (action === "connected")
    return ["accepted", "connecting", "reconnecting", "connected"].includes(
      status,
    );
  if (action === "reconnecting")
    return status === "connecting" || status === "connected";
  return ACTIVE_CALL_STATUSES.has(status);
}

export function formatCallDuration(seconds: number | null | undefined) {
  const safe = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return minutes ? `${minutes} dk ${remainder} sn` : `${remainder} sn`;
}

export function callStatusMessage(status: LiveChatCallStatus) {
  const messages: Record<LiveChatCallStatus, string> = {
    requesting: "Görüşme talebi hazırlanıyor…",
    ringing: "Müşteri temsilcisine bağlanıyor…",
    accepted: "Görüşme kabul edildi.",
    connecting: "Görüntülü görüşme bağlanıyor…",
    connected: "Görüntülü görüşme başladı.",
    reconnecting: "Bağlantı yeniden kuruluyor…",
    ended: "Görüntülü görüşme sona erdi.",
    rejected: "Görüşme talebi reddedildi.",
    missed: "Görüşme talebi zaman aşımına uğradı.",
    failed: "Görüntülü görüşme bağlantısı kurulamadı.",
  };
  return messages[status];
}
