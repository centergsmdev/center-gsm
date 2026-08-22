"use client";

import { useEffect, useRef, useState } from "react";

import { StaticAvatarRenderer } from "@/components/live-chat/video-avatar";
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
  onDiagnosticsChange: (patch: Partial<SafePeerDiagnostics>) => void;
};

type SessionResponse = {
  sessionToken?: string;
  attemptId?: string;
  transport?: "livekit";
  audioStrategy?: "direct-audio";
  error?: string;
};

export function SimliVideoAvatar({
  callId,
  callStatus,
  visitorToken,
  displayName,
  imageUrl,
  stream,
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
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let client: { stop: () => Promise<void> } | null = null;
    let failed = false;

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
          data.audioStrategy !== "direct-audio"
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
          const firstFrameMs = performance.now() - startedAt;
          report("connected", "received", "playing", false, {
            readyMs,
            firstFrameMs,
          });
        });
        const fallback = () => {
          if (disposed || failed) return;
          failed = true;
          report("failed", "waiting", "failed", true, { readyMs });
          if (heartbeat) clearInterval(heartbeat);
          clonedTrack?.stop();
          void simliClient.stop().catch(() => undefined);
          void closeSession(true);
        };
        simliClient.on("error", fallback);
        simliClient.on("startup_error", fallback);
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
        simliClient.listenToMediastreamTrack(clonedTrack);
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
        await client?.stop().catch(() => undefined);
        await closeSession(true);
      }
    }

    void start();
    return () => {
      disposed = true;
      abortController.abort();
      if (heartbeat) clearInterval(heartbeat);
      clonedTrack?.stop();
      void client?.stop().catch(() => undefined);
      void closeSession(failed);
    };
  }, [callActive, callId, stream, visitorToken]);

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
