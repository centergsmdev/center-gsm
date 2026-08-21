"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  createSignalEnvelope,
  SignalReplayGuard,
  type SignalEnvelope,
  type SignalEvent,
  type VideoCallRole,
} from "@/lib/live-chat/video-call";
import {
  createCallRealtimeClient,
  sendPrivateSignal,
} from "@/lib/live-chat/video-realtime";
import { assertAdminPeerHasNoVideoSender } from "@/lib/live-chat/video-media";

type PeerState =
  "idle" | "connecting" | "connected" | "reconnecting" | "failed";

export function useVideoCallPeer(input: {
  callId: string | null;
  participantToken: string | null;
  role: VideoCallRole;
  localStream: MediaStream | null;
  iceServers: RTCIceServer[];
  onRemoteStream: (stream: MediaStream) => void;
  onHangup: () => void;
  onConnected: () => void;
  onReconnecting: () => void;
  onFailed: () => void;
}) {
  const [state, setState] = useState<PeerState>("idle");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sequenceRef = useRef(0);
  const replayGuardRef = useRef(new SignalReplayGuard());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef(input);
  callbacksRef.current = input;
  const { callId, participantToken, role, localStream, iceServers } = input;

  const emit = useCallback(
    async (event: SignalEvent, data: unknown) => {
      if (!channelRef.current || !callId) return;
      sequenceRef.current += 1;
      await sendPrivateSignal(
        channelRef.current,
        event,
        createSignalEnvelope({
          callId,
          sender: role,
          sequence: sequenceRef.current,
          data,
        }),
      );
    },
    [callId, role],
  );

  const sendOffer = useCallback(
    async (iceRestart = false) => {
      const peer = peerRef.current;
      if (!peer || role !== "customer") return;
      if (iceRestart) peer.restartIce();
      const offer = await peer.createOffer({ iceRestart });
      await peer.setLocalDescription(offer);
      await emit(iceRestart ? "ice-restart" : "offer", {
        type: peer.localDescription?.type,
        sdp: peer.localDescription?.sdp,
      });
    },
    [emit, role],
  );

  useEffect(() => {
    if (
      !callId ||
      !participantToken ||
      !localStream ||
      typeof RTCPeerConnection === "undefined"
    )
      return;
    const activeCallId = callId;
    const client = createCallRealtimeClient(participantToken);
    if (!client) {
      callbacksRef.current.onFailed();
      return;
    }
    let disposed = false;
    const remoteRole: VideoCallRole =
      role === "customer" ? "admin" : "customer";
    const peer = new RTCPeerConnection({ iceServers });
    peerRef.current = peer;
    localStream
      .getTracks()
      .forEach((track) => peer.addTrack(track, localStream));
    if (role === "admin") assertAdminPeerHasNoVideoSender(peer);

    peer.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      callbacksRef.current.onRemoteStream(stream);
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void emit("ice-candidate", event.candidate.toJSON());
    };
    function scheduleReconnect() {
      if (retryTimerRef.current || disposed) return;
      if (retryRef.current === 0) {
        setState("reconnecting");
        callbacksRef.current.onReconnecting();
      }
      const attempt = async () => {
        retryTimerRef.current = null;
        if (disposed || peer.connectionState === "connected") return;
        if (retryRef.current >= 3) {
          setState("failed");
          callbacksRef.current.onFailed();
          return;
        }
        retryRef.current += 1;
        if (role === "customer") {
          try {
            await sendOffer(true);
          } catch {
            /* The next bounded retry handles transient signaling state errors. */
          }
        }
        retryTimerRef.current = setTimeout(
          () => void attempt(),
          900 * 2 ** (retryRef.current - 1),
        );
      };
      retryTimerRef.current = setTimeout(() => void attempt(), 700);
    }
    peer.onconnectionstatechange = () => {
      if (disposed) return;
      if (peer.connectionState === "connected") {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
        retryRef.current = 0;
        setState("connected");
        callbacksRef.current.onConnected();
        return;
      }
      if (
        peer.connectionState === "disconnected" ||
        peer.connectionState === "failed"
      ) {
        scheduleReconnect();
      }
    };

    async function flushCandidates() {
      while (pendingCandidatesRef.current.length) {
        const candidate = pendingCandidatesRef.current.shift();
        if (candidate) await peer.addIceCandidate(candidate);
      }
    }

    async function acceptSignal(event: SignalEvent, envelope: unknown) {
      if (
        !replayGuardRef.current.accept(envelope, {
          callId: activeCallId,
          sender: remoteRole,
        })
      )
        return;
      const signal = envelope as SignalEnvelope;
      if (event === "hangup") {
        callbacksRef.current.onHangup();
        return;
      }
      if (event === "peer-ready" && role === "customer") {
        setState("connecting");
        await sendOffer(false);
        return;
      }
      if ((event === "offer" || event === "ice-restart") && role === "admin") {
        const description = signal.data as RTCSessionDescriptionInit;
        await peer.setRemoteDescription(description);
        await flushCandidates();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await emit("answer", {
          type: peer.localDescription?.type,
          sdp: peer.localDescription?.sdp,
        });
        return;
      }
      if (event === "answer" && role === "customer") {
        await peer.setRemoteDescription(
          signal.data as RTCSessionDescriptionInit,
        );
        await flushCandidates();
        return;
      }
      if (event === "ice-candidate") {
        const candidate = signal.data as RTCIceCandidateInit;
        if (peer.remoteDescription) await peer.addIceCandidate(candidate);
        else pendingCandidatesRef.current.push(candidate);
      }
    }

    const channel = client.channel(`call:${activeCallId}`, {
      config: { private: true, broadcast: { self: false, ack: true } },
    });
    channelRef.current = channel;
    (
      [
        "offer",
        "answer",
        "ice-candidate",
        "ice-restart",
        "hangup",
        "peer-ready",
      ] as SignalEvent[]
    ).forEach((event) => {
      channel.on("broadcast", { event }, ({ payload }) => {
        void acceptSignal(event, payload).catch(() =>
          callbacksRef.current.onFailed(),
        );
      });
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setState("connecting");
        void emit("peer-ready", { ready: true });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setState("failed");
        callbacksRef.current.onFailed();
      }
    });

    return () => {
      disposed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
      peerRef.current = null;
      channelRef.current = null;
      pendingCandidatesRef.current = [];
      void client.removeChannel(channel);
    };
  }, [
    callId,
    emit,
    iceServers,
    localStream,
    participantToken,
    role,
    sendOffer,
  ]);

  const sendHangup = useCallback(async () => {
    await emit("hangup", { reason: "user_hangup" });
  }, [emit]);

  return { state, sendHangup };
}
