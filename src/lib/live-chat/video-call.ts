import type { LiveChatCallStatus } from "@/types/database";
import type {
  SimliAudioInputState,
  SimliAudioSourceState,
  SimliAvatarSource,
  SimliInputLevelState,
  SimliPlaybackState,
  SimliSessionState,
  SimliVideoState,
} from "@/lib/live-chat/simli";

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
  | "peer-ready"
  | "diagnostic";

export type IceCandidateType = "host" | "srflx" | "relay" | "prflx" | "unknown";

export type CustomerPlaybackState =
  "waiting" | "playing" | "blocked" | "muted" | "failed";

export type SafeAudioContextState =
  "inactive" | "running" | "suspended" | "interrupted" | "closed";

export type AudioNegotiationDirection =
  RTCRtpTransceiverDirection | "unavailable";

export type SafePeerDiagnostics = {
  role: VideoCallRole;
  channelState: "idle" | "connecting" | "connected" | "failed";
  localMediaReady: boolean;
  localAudioReady: boolean;
  localVideoReady: boolean;
  localAudioTrackReadyState: MediaStreamTrackState | "missing";
  localAudioTrackEnabled: boolean;
  localAudioTrackMuted: boolean;
  audioSenderPresent: boolean;
  audioNegotiationDirection: AudioNegotiationDirection;
  signalingState: RTCSignalingState | "unavailable";
  iceGatheringState: RTCIceGatheringState | "unavailable";
  iceConnectionState: RTCIceConnectionState | "unavailable";
  connectionState: RTCPeerConnectionState | "unavailable";
  localCandidateTypes: IceCandidateType[];
  offerCreated: boolean;
  offerSent: boolean;
  offerReceived: boolean;
  answerCreated: boolean;
  answerSent: boolean;
  answerReceived: boolean;
  remoteDescriptionSet: boolean;
  iceCandidatesSent: number;
  iceCandidatesReceived: number;
  iceCandidatesAdded: number;
  remoteAudioReceived: boolean;
  remoteVideoReceived: boolean;
  customerPlaybackState: CustomerPlaybackState;
  audioContextState: SafeAudioContextState;
  outboundAudioPacketsSent: number;
  outboundAudioBytesSent: number;
  inboundAudioPacketsReceived: number;
  inboundAudioBytesReceived: number;
  avatarMode: "static" | "audio-reactive" | "simli-trinity";
  simliSessionState: SimliSessionState;
  simliAvatarVideoState: SimliVideoState;
  simliAvatarPlaybackState: SimliPlaybackState;
  simliFallbackActive: boolean;
  simliSessionReadyMs: number | null;
  simliFirstFrameMs: number | null;
  simliFaceLoaded: boolean;
  simliAudioSourceState: SimliAudioSourceState;
  simliAudioTrackReadyState: MediaStreamTrackState | "missing";
  simliAudioTrackEnabled: boolean;
  simliAudioTrackMuted: boolean;
  simliAudioInputState: SimliAudioInputState;
  simliInputLevelState: SimliInputLevelState;
  simliAudioContextState: SafeAudioContextState;
  simliAudioChunksSent: number;
  simliAudioBytesSent: number;
  simliAudioAckCount: number;
  simliAvatarSource: SimliAvatarSource;
  simliVideoFramesReceived: number;
  simliVideoBytesReceived: number | null;
  simliVideoPlaybackTimeMs: number;
  simliApproxAvatarLatencyMs: number | null;
};

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

export function getIceCandidateType(
  candidate: string | null | undefined,
): IceCandidateType {
  const match = candidate?.match(
    /(?:^|\s)typ\s+(host|srflx|relay|prflx)(?:\s|$)/i,
  );
  return (
    (match?.[1]?.toLowerCase() as IceCandidateType | undefined) ?? "unknown"
  );
}

export function isSafePeerDiagnostics(
  value: unknown,
): value is SafePeerDiagnostics {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<SafePeerDiagnostics>;
  return (
    (input.role === "customer" || input.role === "admin") &&
    ["idle", "connecting", "connected", "failed"].includes(
      String(input.channelState),
    ) &&
    typeof input.localMediaReady === "boolean" &&
    typeof input.localAudioReady === "boolean" &&
    typeof input.localVideoReady === "boolean" &&
    ["live", "ended", "missing"].includes(
      String(input.localAudioTrackReadyState),
    ) &&
    typeof input.localAudioTrackEnabled === "boolean" &&
    typeof input.localAudioTrackMuted === "boolean" &&
    typeof input.audioSenderPresent === "boolean" &&
    [
      "sendrecv",
      "sendonly",
      "recvonly",
      "inactive",
      "stopped",
      "unavailable",
    ].includes(String(input.audioNegotiationDirection)) &&
    Array.isArray(input.localCandidateTypes) &&
    input.localCandidateTypes.every((type) =>
      ["host", "srflx", "relay", "prflx", "unknown"].includes(type),
    ) &&
    Number.isSafeInteger(input.iceCandidatesSent) &&
    Number.isSafeInteger(input.iceCandidatesReceived) &&
    Number.isSafeInteger(input.iceCandidatesAdded) &&
    ["waiting", "playing", "blocked", "muted", "failed"].includes(
      String(input.customerPlaybackState),
    ) &&
    ["inactive", "running", "suspended", "interrupted", "closed"].includes(
      String(input.audioContextState),
    ) &&
    Number.isSafeInteger(input.outboundAudioPacketsSent) &&
    Number.isSafeInteger(input.outboundAudioBytesSent) &&
    Number.isSafeInteger(input.inboundAudioPacketsReceived) &&
    Number.isSafeInteger(input.inboundAudioBytesReceived) &&
    ["static", "audio-reactive", "simli-trinity"].includes(
      String(input.avatarMode),
    ) &&
    [
      "idle",
      "waiting-audio",
      "requesting",
      "connecting",
      "connected",
      "ended",
      "failed",
    ].includes(String(input.simliSessionState)) &&
    ["waiting", "received"].includes(String(input.simliAvatarVideoState)) &&
    ["waiting", "playing", "failed"].includes(
      String(input.simliAvatarPlaybackState),
    ) &&
    typeof input.simliFallbackActive === "boolean" &&
    (input.simliSessionReadyMs === null ||
      (Number.isSafeInteger(input.simliSessionReadyMs) &&
        Number(input.simliSessionReadyMs) >= 0 &&
        Number(input.simliSessionReadyMs) <= 120_000)) &&
    (input.simliFirstFrameMs === null ||
      (Number.isSafeInteger(input.simliFirstFrameMs) &&
        Number(input.simliFirstFrameMs) >= 0 &&
        Number(input.simliFirstFrameMs) <= 120_000)) &&
    typeof input.simliFaceLoaded === "boolean" &&
    ["waiting", "attached", "missing"].includes(
      String(input.simliAudioSourceState),
    ) &&
    ["live", "ended", "missing"].includes(
      String(input.simliAudioTrackReadyState),
    ) &&
    typeof input.simliAudioTrackEnabled === "boolean" &&
    typeof input.simliAudioTrackMuted === "boolean" &&
    ["waiting", "flowing", "silent", "failed"].includes(
      String(input.simliAudioInputState),
    ) &&
    ["waiting", "active", "silent"].includes(
      String(input.simliInputLevelState),
    ) &&
    ["inactive", "running", "suspended", "interrupted", "closed"].includes(
      String(input.simliAudioContextState),
    ) &&
    Number.isSafeInteger(input.simliAudioChunksSent) &&
    Number(input.simliAudioChunksSent) >= 0 &&
    Number.isSafeInteger(input.simliAudioBytesSent) &&
    Number(input.simliAudioBytesSent) >= 0 &&
    Number.isSafeInteger(input.simliAudioAckCount) &&
    Number(input.simliAudioAckCount) >= 0 &&
    ["static-fallback", "simli-video"].includes(
      String(input.simliAvatarSource),
    ) &&
    Number.isSafeInteger(input.simliVideoFramesReceived) &&
    Number(input.simliVideoFramesReceived) >= 0 &&
    (input.simliVideoBytesReceived === null ||
      (Number.isSafeInteger(input.simliVideoBytesReceived) &&
        Number(input.simliVideoBytesReceived) >= 0)) &&
    Number.isSafeInteger(input.simliVideoPlaybackTimeMs) &&
    Number(input.simliVideoPlaybackTimeMs) >= 0 &&
    (input.simliApproxAvatarLatencyMs === null ||
      (Number.isSafeInteger(input.simliApproxAvatarLatencyMs) &&
        Number(input.simliApproxAvatarLatencyMs) >= 0 &&
        Number(input.simliApproxAvatarLatencyMs) <= 120_000))
  );
}

export function retainActiveParticipantToken(
  currentToken: string | null,
  refreshedToken: string | null | undefined,
) {
  return currentToken ?? refreshedToken ?? null;
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
