import type { LiveChatCallStatus } from "@/types/database";

export const SIMLI_AVATAR_MODE = "simli-trinity" as const;
export const SIMLI_AUDIO_STRATEGY = "direct-audio" as const;
export const SIMLI_TRANSPORT = "livekit" as const;

export type SimliSessionState =
  | "idle"
  | "waiting-audio"
  | "requesting"
  | "connecting"
  | "connected"
  | "ended"
  | "failed";
export type SimliVideoState = "waiting" | "received";
export type SimliPlaybackState = "waiting" | "playing" | "failed";

const SIMLI_CALL_STATUSES = new Set<LiveChatCallStatus>([
  "accepted",
  "connecting",
  "connected",
  "reconnecting",
]);

export function isSimliCallStatus(status: LiveChatCallStatus) {
  return SIMLI_CALL_STATUSES.has(status);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function safeTiming(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(120_000, Math.round(Number(value))));
}

export function isTemporarySessionToken(value: unknown): value is string {
  return (
    typeof value === "string" && value.length >= 16 && value.length <= 8192
  );
}
