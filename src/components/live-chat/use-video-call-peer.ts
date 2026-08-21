"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  createSignalEnvelope,
  getIceCandidateType,
  isSafePeerDiagnostics,
  SignalReplayGuard,
  type IceCandidateType,
  type SafePeerDiagnostics,
  type SignalEnvelope,
  type SignalEvent,
  type VideoCallRole,
} from "@/lib/live-chat/video-call";
import {
  authorizeCallRealtimeClient,
  createCallRealtimeClient,
  sendPrivateSignal,
} from "@/lib/live-chat/video-realtime";
import { assertAdminPeerHasNoVideoSender } from "@/lib/live-chat/video-media";

type PeerState =
  "idle" | "connecting" | "connected" | "reconnecting" | "failed";

function initialDiagnostics(
  role: VideoCallRole,
  stream: MediaStream | null,
): SafePeerDiagnostics {
  const localAudioReady = Boolean(stream?.getAudioTracks().length);
  const localVideoReady = Boolean(stream?.getVideoTracks().length);
  return {
    role,
    channelState: "idle",
    localMediaReady: localAudioReady || localVideoReady,
    localAudioReady,
    localVideoReady,
    signalingState: "unavailable",
    iceGatheringState: "unavailable",
    iceConnectionState: "unavailable",
    connectionState: "unavailable",
    localCandidateTypes: [],
    offerCreated: false,
    offerSent: false,
    offerReceived: false,
    answerCreated: false,
    answerSent: false,
    answerReceived: false,
    remoteDescriptionSet: false,
    iceCandidatesSent: 0,
    iceCandidatesReceived: 0,
    iceCandidatesAdded: 0,
    remoteAudioReceived: false,
    remoteVideoReceived: false,
  };
}

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
  const [diagnostics, setDiagnostics] = useState<SafePeerDiagnostics>(() =>
    initialDiagnostics(input.role, input.localStream),
  );
  const [remoteDiagnostics, setRemoteDiagnostics] =
    useState<SafePeerDiagnostics | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sequenceRef = useRef(0);
  const replayGuardRef = useRef(new SignalReplayGuard());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef(input);
  const diagnosticsRef = useRef(diagnostics);
  callbacksRef.current = input;
  diagnosticsRef.current = diagnostics;
  const { callId, participantToken, role, localStream, iceServers } = input;

  const emit = useCallback(
    async (event: SignalEvent, data: unknown) => {
      if (!channelRef.current || !callId) return;
      sequenceRef.current += 1;
      const result = await sendPrivateSignal(
        channelRef.current,
        event,
        createSignalEnvelope({
          callId,
          sender: role,
          sequence: sequenceRef.current,
          data,
        }),
      );
      if (result !== "ok") throw new Error(`signal_send_${result}`);
    },
    [callId, role],
  );

  const sendOffer = useCallback(
    async (iceRestart = false) => {
      const peer = peerRef.current;
      if (!peer || role !== "customer") return;
      if (iceRestart) peer.restartIce();
      const offer = await peer.createOffer({ iceRestart });
      const createdDiagnostics = {
        ...diagnosticsRef.current,
        offerCreated: true,
        signalingState: peer.signalingState,
      };
      diagnosticsRef.current = createdDiagnostics;
      setDiagnostics(createdDiagnostics);
      await peer.setLocalDescription(offer);
      await emit(iceRestart ? "ice-restart" : "offer", {
        type: peer.localDescription?.type,
        sdp: peer.localDescription?.sdp,
      });
      const sentDiagnostics = {
        ...diagnosticsRef.current,
        offerSent: true,
        signalingState: peer.signalingState,
      };
      diagnosticsRef.current = sentDiagnostics;
      setDiagnostics(sentDiagnostics);
      await emit("diagnostic", sentDiagnostics);
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
    let channelSubscribed = false;
    let initialOfferSent = false;
    const remoteRole: VideoCallRole =
      role === "customer" ? "admin" : "customer";
    const peer = new RTCPeerConnection({ iceServers });
    peerRef.current = peer;
    localStream
      .getTracks()
      .forEach((track) => peer.addTrack(track, localStream));
    if (role === "admin") assertAdminPeerHasNoVideoSender(peer);

    const startingDiagnostics = initialDiagnostics(role, localStream);
    startingDiagnostics.signalingState = peer.signalingState;
    startingDiagnostics.iceGatheringState = peer.iceGatheringState;
    startingDiagnostics.iceConnectionState = peer.iceConnectionState;
    startingDiagnostics.connectionState = peer.connectionState;
    diagnosticsRef.current = startingDiagnostics;
    setDiagnostics(startingDiagnostics);
    setRemoteDiagnostics(null);

    function updateDiagnostics(
      patch: Partial<SafePeerDiagnostics>,
      publish = true,
    ) {
      const next = { ...diagnosticsRef.current, ...patch };
      diagnosticsRef.current = next;
      setDiagnostics(next);
      if (publish && channelSubscribed)
        void emit("diagnostic", next).catch(() => undefined);
    }

    function addLocalCandidateType(type: IceCandidateType) {
      if (diagnosticsRef.current.localCandidateTypes.includes(type)) return;
      updateDiagnostics({
        localCandidateTypes: [
          ...diagnosticsRef.current.localCandidateTypes,
          type,
        ],
      });
    }

    peer.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      updateDiagnostics({
        remoteAudioReceived:
          diagnosticsRef.current.remoteAudioReceived ||
          event.track.kind === "audio",
        remoteVideoReceived:
          diagnosticsRef.current.remoteVideoReceived ||
          event.track.kind === "video",
      });
      callbacksRef.current.onRemoteStream(stream);
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      addLocalCandidateType(getIceCandidateType(event.candidate.candidate));
      updateDiagnostics({
        iceCandidatesSent: diagnosticsRef.current.iceCandidatesSent + 1,
      });
      void emit("ice-candidate", event.candidate.toJSON()).catch(() =>
        callbacksRef.current.onFailed(),
      );
    };
    peer.onsignalingstatechange = () =>
      updateDiagnostics({ signalingState: peer.signalingState });
    peer.onicegatheringstatechange = () =>
      updateDiagnostics({ iceGatheringState: peer.iceGatheringState });
    peer.oniceconnectionstatechange = () =>
      updateDiagnostics({ iceConnectionState: peer.iceConnectionState });
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
          updateDiagnostics({
            channelState: "failed",
            connectionState: peer.connectionState,
          });
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
      updateDiagnostics({ connectionState: peer.connectionState });
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
        if (candidate) {
          await peer.addIceCandidate(candidate);
          updateDiagnostics({
            iceCandidatesAdded: diagnosticsRef.current.iceCandidatesAdded + 1,
          });
        }
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
      if (event === "diagnostic") {
        if (isSafePeerDiagnostics(signal.data))
          setRemoteDiagnostics(signal.data);
        return;
      }
      if (event === "hangup") {
        callbacksRef.current.onHangup();
        return;
      }
      if (event === "peer-ready") {
        if (role === "customer" && !initialOfferSent) {
          initialOfferSent = true;
          setState("connecting");
          await sendOffer(false);
        } else if (role === "admin") {
          await emit("peer-ready", { ready: true, acknowledgement: true });
        }
        return;
      }
      if ((event === "offer" || event === "ice-restart") && role === "admin") {
        updateDiagnostics({ offerReceived: true });
        const description = signal.data as RTCSessionDescriptionInit;
        await peer.setRemoteDescription(description);
        updateDiagnostics({
          remoteDescriptionSet: true,
          signalingState: peer.signalingState,
        });
        await flushCandidates();
        const answer = await peer.createAnswer();
        updateDiagnostics({ answerCreated: true });
        await peer.setLocalDescription(answer);
        await emit("answer", {
          type: peer.localDescription?.type,
          sdp: peer.localDescription?.sdp,
        });
        updateDiagnostics({
          answerSent: true,
          signalingState: peer.signalingState,
        });
        return;
      }
      if (event === "answer" && role === "customer") {
        updateDiagnostics({ answerReceived: true });
        await peer.setRemoteDescription(
          signal.data as RTCSessionDescriptionInit,
        );
        updateDiagnostics({
          remoteDescriptionSet: true,
          signalingState: peer.signalingState,
        });
        await flushCandidates();
        return;
      }
      if (event === "ice-candidate") {
        const candidate = signal.data as RTCIceCandidateInit;
        updateDiagnostics({
          iceCandidatesReceived:
            diagnosticsRef.current.iceCandidatesReceived + 1,
        });
        if (peer.remoteDescription) {
          await peer.addIceCandidate(candidate);
          updateDiagnostics({
            iceCandidatesAdded: diagnosticsRef.current.iceCandidatesAdded + 1,
          });
        } else pendingCandidatesRef.current.push(candidate);
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
        "diagnostic",
      ] as SignalEvent[]
    ).forEach((event) => {
      channel.on("broadcast", { event }, ({ payload }) => {
        void acceptSignal(event, payload).catch(() =>
          callbacksRef.current.onFailed(),
        );
      });
    });
    void authorizeCallRealtimeClient(client)
      .then(() => {
        if (disposed) return;
        updateDiagnostics({ channelState: "connecting" }, false);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channelSubscribed = true;
            setState("connecting");
            updateDiagnostics({ channelState: "connected" }, false);
            void emit("peer-ready", {
              ready: true,
              acknowledgement: false,
            })
              .then(() => emit("diagnostic", diagnosticsRef.current))
              .catch(() => {
                updateDiagnostics({ channelState: "failed" }, false);
                setState("failed");
                callbacksRef.current.onFailed();
              });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            channelSubscribed = false;
            updateDiagnostics({ channelState: "failed" }, false);
            setState("failed");
            callbacksRef.current.onFailed();
          }
        });
      })
      .catch(() => {
        if (disposed) return;
        updateDiagnostics({ channelState: "failed" }, false);
        setState("failed");
        callbacksRef.current.onFailed();
      });

    return () => {
      disposed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onsignalingstatechange = null;
      peer.onicegatheringstatechange = null;
      peer.oniceconnectionstatechange = null;
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

  return { state, diagnostics, remoteDiagnostics, sendHangup };
}
