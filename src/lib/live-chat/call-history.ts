import type { LiveChatCall, LiveChatMessage } from "@/types/database";

export type CallHistoryOutcome =
  | "active"
  | "answered"
  | "missed"
  | "rejected"
  | "failed"
  | "cancelled"
  | "ended";

export type ChatTimelineEntry =
  | { kind: "message"; id: string; timestamp: string; message: LiveChatMessage }
  | { kind: "call"; id: string; timestamp: string; call: LiveChatCall };

export function callHistoryOutcome(call: LiveChatCall): CallHistoryOutcome {
  if (
    [
      "requesting",
      "ringing",
      "accepted",
      "connecting",
      "connected",
      "reconnecting",
    ].includes(call.status)
  )
    return "active";
  if (call.status === "missed") return "missed";
  if (call.status === "rejected") return "rejected";
  if (call.status === "failed") return "failed";
  if (call.connected_at && call.ended_at) return "answered";
  if (call.status === "ended" && call.ended_by === "customer")
    return "cancelled";
  return "ended";
}

export function callHistoryDurationSeconds(call: LiveChatCall) {
  if (!call.connected_at || !call.ended_at) return null;
  const connectedAt = new Date(call.connected_at).getTime();
  const endedAt = new Date(call.ended_at).getTime();
  if (!Number.isFinite(connectedAt) || !Number.isFinite(endedAt)) return null;
  return Math.max(0, Math.floor((endedAt - connectedAt) / 1000));
}

export function callHistoryTimestamp(call: LiveChatCall) {
  return call.ended_at ?? call.requested_at;
}

export function buildChatTimeline(
  messages: LiveChatMessage[],
  calls: LiveChatCall[],
): ChatTimelineEntry[] {
  return [
    ...messages.map((message) => ({
      kind: "message" as const,
      id: `message:${message.id}`,
      timestamp: message.created_at,
      message,
    })),
    ...calls.map((call) => ({
      kind: "call" as const,
      id: `call:${call.id}`,
      timestamp: callHistoryTimestamp(call),
      call,
    })),
  ].sort((left, right) => {
    const difference =
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
    return difference || left.id.localeCompare(right.id);
  });
}
