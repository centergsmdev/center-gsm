"use client";

import { useEffect, useRef, useState } from "react";

import { StaticAvatarRenderer } from "@/components/live-chat/video-avatar";
import {
  startSimliAudioInput,
  type SimliAudioInput,
  type SimliAudioInputSnapshot,
} from "@/lib/live-chat/simli-audio-input";
import {
  isSimliCallStatus,
  safeTiming,
  type SimliPlaybackState,
  type SimliSessionState,
  type SimliVideoState,
} from "@/lib/live-chat/simli";
import type { SafePeerDiagnostics } from "@/lib/live-chat/video-call";
import type { LiveChatCallStatus } from "@/types/database";

type Props = {
  callId: string;
  callStatus: LiveChatCallStatus;
  visitorToken: string;
  displayName: string;
  imageUrl: string | null;
  stream: MediaStream | null;
  preparedAudioContext: AudioContext | null;
  onDiagnosticsChange: (patch: Partial<SafePeerDiagnostics>) => void;
};

type SessionResponse = {
  sessionToken?: string;
  attemptId?: string;
  transport?: "livekit";
  audioStrategy?: "pcm16-audio";
  error?: string;
};

export function SimliVideoAvatar({
  callId,
  callStatus,
  visitorToken,
  displayName,
  imageUrl,
  stream,
  preparedAudioContext,
  onDiagnosticsChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mutedAudioRef = useRef<HTMLAudioElement>(null);
  const diagnosticsRef = useRef(onDiagnosticsChange);
  const [sessionState, setSessionState] = useState<SimliSessionState>("idle");
  const [videoState, setVideoState] = useState<SimliVideoState>("waiting");
  const [playbackState, setPlaybackState] =
    useState<SimliPlaybackState>("waiting");
  const [fallbackActive, setFallbackActive] = useState(true);
  const callActive = isSimliCallStatus(callStatus);

  diagnosticsRef.current = onDiagnosticsChange;

  useEffect(() => {
    const audio = mutedAudioRef.current;
    if (!audio) return;
    // PoC A: the native admin -> customer WebRTC audio remains the only
    // audible source. Simli output audio must never reach the speakers.
    audio.muted = true;
    audio.volume = 0;
    audio.setAttribute("muted", "");
  }, []);

  useEffect(() => {
    const report = (
      state: SimliSessionState,
      video: SimliVideoState,
      playback: SimliPlaybackState,
      fallback: boolean,
      timing?: { readyMs?: number | null; firstFrameMs?: number | null },
    ) => {
      setSessionState(state);
      setVideoState(video);
      setPlaybackState(playback);
      setFallbackActive(fallback);
      diagnosticsRef.current({
        avatarMode: "simli-trinity",
        simliSessionState: state,
        simliAvatarVideoState: video,
        simliAvatarPlaybackState: playback,
        simliFallbackActive: fallback,
        simliSessionReadyMs: safeTiming(timing?.readyMs),
        simliFirstFrameMs: safeTiming(timing?.firstFrameMs),
        simliFaceLoaded: false,
        simliAudioSourceState: "waiting",
        simliAudioTrackReadyState: "missing",
        simliAudioTrackEnabled: false,
        simliAudioTrackMuted: false,
        simliAudioInputState: "waiting",
        simliInputLevelState: "waiting",
        simliAudioContextState: "inactive",
        simliAudioChunksSent: 0,
        simliAudioBytesSent: 0,
        simliAudioAckCount: 0,
        simliAvatarSource: "static-fallback",
        simliVideoFramesReceived: 0,
        simliVideoBytesReceived: null,
        simliVideoPlaybackTimeMs: 0,
        simliApproxAvatarLatencyMs: null,
      });
    };

    const remoteAudioTrack = stream
      ?.getAudioTracks()
      .find((track) => track.readyState === "live");
    if (!callActive || !remoteAudioTrack) {
      report(callActive ? "waiting-audio" : "idle", "waiting", "waiting", true);
      return;
    }
    const video = videoRef.current;
    const mutedAudio = mutedAudioRef.current;
    if (!video || !mutedAudio) return;
    const simliVideoElement: HTMLVideoElement = video;
    const simliMutedAudioElement: HTMLAudioElement = mutedAudio;
    const inputAudioTrack: MediaStreamTrack = remoteAudioTrack;

    const attemptId = crypto.randomUUID();
    const startedAt = performance.now();
    const abortController = new AbortController();
    let disposed = false;
    let clonedTrack: MediaStreamTrack | null = null;
    let simliAudioInput: SimliAudioInput | null = null;
    let inputSnapshot: SimliAudioInputSnapshot | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let diagnosticsTimer: ReturnType<typeof setInterval> | null = null;
    let client: {
      stop: () => Promise<void>;
      sendAudioData: (audioData: Uint8Array) => void;
    } | null = null;
    let failed = false;
    let audioAckCount = 0;
    let lastFrames = 0;
    let lastPlaybackTime = 0;
    let lastActiveInputAt: number | null = null;
    let simliVideoActive = false;

    function videoCounters() {
      const quality = simliVideoElement.getVideoPlaybackQuality?.();
      const extendedVideo = simliVideoElement as HTMLVideoElement & {
        webkitDecodedFrameCount?: number;
        webkitVideoDecodedByteCount?: number;
      };
      return {
        frames: Math.max(
          0,
          Math.round(
            quality?.totalVideoFrames ??
              extendedVideo.webkitDecodedFrameCount ??
              0,
          ),
        ),
        bytes:
          typeof extendedVideo.webkitVideoDecodedByteCount === "number"
            ? Math.max(0, Math.round(extendedVideo.webkitVideoDecodedByteCount))
            : null,
      };
    }

    function publishFlowDiagnostics() {
      const counters = videoCounters();
      const playbackTimeMs = Math.max(
        0,
        Math.round(simliVideoElement.currentTime * 1000),
      );
      const videoTrack =
        simliVideoElement.srcObject instanceof MediaStream
          ? simliVideoElement.srcObject.getVideoTracks()[0]
          : undefined;
      const playbackAdvancing =
        !simliVideoElement.paused &&
        simliVideoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        (counters.frames > lastFrames || playbackTimeMs > lastPlaybackTime);
      lastFrames = counters.frames;
      lastPlaybackTime = playbackTimeMs;
      const inputLevel = inputSnapshot?.inputLevel ?? 0;
      if (inputLevel >= 0.008) lastActiveInputAt = performance.now();
      diagnosticsRef.current({
        simliFaceLoaded: counters.frames > 0,
        simliAudioSourceState: simliAudioInput ? "attached" : "missing",
        simliAudioTrackReadyState:
          clonedTrack?.readyState ?? inputAudioTrack.readyState,
        simliAudioTrackEnabled: clonedTrack?.enabled ?? inputAudioTrack.enabled,
        simliAudioTrackMuted: clonedTrack?.muted ?? inputAudioTrack.muted,
        simliAudioInputState:
          (inputSnapshot?.chunksSent ?? 0) > 0 ? "flowing" : "silent",
        simliInputLevelState: inputLevel >= 0.008 ? "active" : "silent",
        simliAudioContextState:
          inputSnapshot?.contextState ??
          preparedAudioContext?.state ??
          "inactive",
        simliAudioChunksSent: inputSnapshot?.chunksSent ?? 0,
        simliAudioBytesSent: inputSnapshot?.bytesSent ?? 0,
        simliAudioAckCount: audioAckCount,
        simliAvatarSource:
          simliVideoActive &&
          videoTrack?.readyState === "live" &&
          counters.frames > 0
            ? "simli-video"
            : "static-fallback",
        simliVideoFramesReceived: counters.frames,
        simliVideoBytesReceived: counters.bytes,
        simliVideoPlaybackTimeMs: playbackTimeMs,
        simliAvatarPlaybackState: playbackAdvancing ? "playing" : "waiting",
      });
    }

    async function closeSession(markFailed: boolean) {
      await fetch("/api/live-chat/simli-session", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: visitorToken,
          callId,
          attemptId,
          failed: markFailed,
        }),
        keepalive: true,
      }).catch(() => undefined);
    }

    async function start() {
      report("requesting", "waiting", "waiting", true);
      try {
        const response = await fetch("/api/live-chat/simli-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: visitorToken, callId, attemptId }),
          signal: abortController.signal,
        });
        const data = (await response.json()) as SessionResponse;
        if (
          !response.ok ||
          !data.sessionToken ||
          data.attemptId !== attemptId ||
          data.transport !== "livekit" ||
          data.audioStrategy !== "pcm16-audio"
        )
          throw new Error(data.error ?? "simli_session_failed");
        if (disposed) {
          await closeSession(false);
          return;
        }
        const readyMs = performance.now() - startedAt;
        report("connecting", "waiting", "waiting", true, { readyMs });
        // simli-client@3.0.2's root CommonJS entry imports "./Client" while
        // the published Linux file is lowercase (client.js). Importing the
        // typed implementation entry keeps Vercel's case-sensitive build safe.
        const { LogLevel, SimliClient } =
          await import("simli-client/dist/client.js");
        const simliClient = new SimliClient(
          data.sessionToken,
          simliVideoElement,
          simliMutedAudioElement,
          null,
          LogLevel.INFO,
          "livekit",
        );
        client = simliClient;
        simliClient.on("start", () => {
          if (disposed) return;
          simliVideoActive = true;
          const firstFrameMs = performance.now() - startedAt;
          report("connected", "received", "playing", false, {
            readyMs,
            firstFrameMs,
          });
          diagnosticsRef.current({
            simliFaceLoaded: true,
            simliAvatarSource: "simli-video",
          });
        });
        const fallback = () => {
          if (disposed || failed) return;
          failed = true;
          simliVideoActive = false;
          report("failed", "waiting", "failed", true, { readyMs });
          diagnosticsRef.current({
            simliAudioInputState: "failed",
            simliAudioSourceState: clonedTrack ? "attached" : "missing",
          });
          if (heartbeat) clearInterval(heartbeat);
          if (diagnosticsTimer) clearInterval(diagnosticsTimer);
          simliAudioInput?.stop();
          clonedTrack?.stop();
          void simliClient.stop().catch(() => undefined);
          void closeSession(true);
        };
        simliClient.on("error", fallback);
        simliClient.on("startup_error", fallback);
        simliClient.on("ack", () => {
          audioAckCount += 1;
        });
        simliClient.on("speaking", () => {
          if (lastActiveInputAt == null) return;
          diagnosticsRef.current({
            simliApproxAvatarLatencyMs: safeTiming(
              performance.now() - lastActiveInputAt,
            ),
          });
        });
        simliClient.on("stop", () => {
          if (!disposed && !failed)
            report("ended", "waiting", "waiting", true, { readyMs });
        });
        await simliClient.start();
        if (disposed) {
          await simliClient.stop().catch(() => undefined);
          await closeSession(false);
          return;
        }
        clonedTrack = inputAudioTrack.clone();
        diagnosticsRef.current({
          simliAudioSourceState: "attached",
          simliAudioTrackReadyState: clonedTrack.readyState,
          simliAudioTrackEnabled: clonedTrack.enabled,
          simliAudioTrackMuted: clonedTrack.muted,
          simliAudioContextState: preparedAudioContext?.state ?? "suspended",
        });
        simliAudioInput = await startSimliAudioInput({
          track: clonedTrack,
          client: simliClient,
          preparedContext: preparedAudioContext,
          onSnapshot: (snapshot) => {
            inputSnapshot = snapshot;
            if (snapshot.inputLevel >= 0.008)
              lastActiveInputAt = performance.now();
          },
          onError: fallback,
        });
        diagnosticsRef.current({
          simliAudioSourceState: "attached",
          simliAudioContextState: simliAudioInput.context.state,
        });
        diagnosticsTimer = setInterval(publishFlowDiagnostics, 1_000);
        publishFlowDiagnostics();
        const renew = () =>
          void fetch("/api/live-chat/simli-session", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: visitorToken, callId, attemptId }),
          }).then((result) => {
            if (!result.ok) fallback();
          });
        renew();
        heartbeat = setInterval(renew, 20_000);
      } catch (reason) {
        if (
          disposed ||
          (reason instanceof DOMException && reason.name === "AbortError")
        )
          return;
        failed = true;
        report("failed", "waiting", "failed", true);
        diagnosticsRef.current({
          simliAudioInputState: "failed",
          simliAudioSourceState: clonedTrack ? "attached" : "missing",
          simliAudioTrackReadyState:
            clonedTrack?.readyState ?? inputAudioTrack.readyState,
          simliAudioTrackEnabled:
            clonedTrack?.enabled ?? inputAudioTrack.enabled,
          simliAudioTrackMuted: clonedTrack?.muted ?? inputAudioTrack.muted,
        });
        await client?.stop().catch(() => undefined);
        await closeSession(true);
      }
    }

    void start();
    return () => {
      disposed = true;
      abortController.abort();
      if (heartbeat) clearInterval(heartbeat);
      if (diagnosticsTimer) clearInterval(diagnosticsTimer);
      simliAudioInput?.stop();
      clonedTrack?.stop();
      void client?.stop().catch(() => undefined);
      void closeSession(failed);
    };
  }, [callActive, callId, preparedAudioContext, stream, visitorToken]);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 to-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`size-full min-h-0 object-cover transition-opacity ${fallbackActive ? "opacity-0" : "opacity-100"}`}
        aria-label={`${displayName} dijital temsilci görüntüsü`}
      />
      <audio ref={mutedAudioRef} muted playsInline aria-hidden="true" />
      {fallbackActive ? (
        <div className="absolute inset-0">
          <StaticAvatarRenderer
            displayName={displayName}
            imageUrl={imageUrl}
            stream={stream}
            mode="static"
            audioActivated={false}
          />
        </div>
      ) : null}
      <div className="absolute inset-x-3 bottom-3 flex justify-center">
        <span className="rounded-full border border-white/20 bg-zinc-950/75 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
          Dijital Temsilci
        </span>
      </div>
      {sessionState !== "connected" && sessionState !== "failed" ? (
        <div className="absolute inset-x-3 top-3 text-center">
          <span className="inline-flex rounded-full bg-zinc-950/75 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
            Dijital temsilci hazırlanıyor…
          </span>
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">
        Avatar oturumu {sessionState}; video {videoState}; oynatma{" "}
        {playbackState}
      </span>
    </div>
  );
}
