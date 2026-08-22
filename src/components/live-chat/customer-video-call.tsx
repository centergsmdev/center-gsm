"use client";

import {
  Camera,
  CameraOff,
  Maximize2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useVideoCallPeer } from "@/components/live-chat/use-video-call-peer";
import { VideoAvatar } from "@/components/live-chat/video-avatar";
import {
  ACTIVE_CALL_STATUSES,
  TERMINAL_CALL_STATUSES,
  callStatusMessage,
  retainActiveParticipantToken,
  type CustomerPlaybackState,
  type SafeAudioContextState,
  type VideoCallAction,
} from "@/lib/live-chat/video-call";
import { requestCustomerMedia } from "@/lib/live-chat/video-media";
import { stopMediaStream } from "@/lib/live-chat/video-realtime";
import type { PublicVideoSettings } from "@/lib/live-chat/video-server";
import type { LiveChatCall } from "@/types/database";

type CallResponse = {
  call?: LiveChatCall;
  participant?: { token: string; expiresAt: number } | null;
  iceServers?: RTCIceServer[];
  settings?: PublicVideoSettings;
  error?: string;
  code?: string;
};

export function CustomerVideoCall({
  token,
  conversationId,
}: {
  token: string;
  conversationId: string;
}) {
  const [settings, setSettings] = useState<PublicVideoSettings | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pending, setPending] = useState(false);
  const [call, setCall] = useState<LiveChatCall | null>(null);
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioActivated, setAudioActivated] = useState(false);
  const [playbackState, setPlaybackState] =
    useState<CustomerPlaybackState>("waiting");
  const [audioContextState, setAudioContextState] =
    useState<SafeAudioContextState>("inactive");
  const [error, setError] = useState("");
  const callRef = useRef<LiveChatCall | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/live-chat/video-calls", { cache: "no-store" })
      .then((response) => response.json() as Promise<CallResponse>)
      .then((data) => {
        if (!cancelled && data.settings) setSettings(data.settings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selfVideoRef.current) selfVideoRef.current.srcObject = localStream;
  }, [localStream, minimized]);

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio || !remoteStream) return;
    if (!remoteStream.getAudioTracks().length) {
      setPlaybackState("waiting");
      return;
    }
    audio.srcObject = remoteStream;
    audio.muted = false;
    audio.volume = 1;
    const handlePlaying = () => {
      setAudioBlocked(false);
      setAudioActivated(true);
      setPlaybackState("playing");
    };
    const handleVolumeChange = () => {
      if (audio.muted || audio.volume === 0) setPlaybackState("muted");
    };
    const handleError = () => setPlaybackState("failed");
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("volumechange", handleVolumeChange);
    audio.addEventListener("error", handleError);
    void audio
      .play()
      .then(handlePlaying)
      .catch((reason: unknown) => {
        const blocked =
          reason instanceof DOMException && reason.name === "NotAllowedError";
        setAudioBlocked(blocked);
        setPlaybackState(blocked ? "blocked" : "failed");
      });
    return () => {
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.removeEventListener("error", handleError);
    };
  }, [remoteStream]);

  const updateCall = useCallback(
    async (action: VideoCallAction, reason?: string) => {
      const current = callRef.current;
      if (!current) return null;
      const response = await fetch("/api/live-chat/video-calls", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          callId: current.id,
          revision: current.revision,
          action,
          reason,
        }),
        keepalive: action === "end" || action === "fail",
      });
      const data = (await response.json()) as CallResponse;
      if (data.call) {
        callRef.current = data.call;
        setCall(data.call);
      }
      if (data.participant?.token) {
        setParticipantToken((current) =>
          retainActiveParticipantToken(current, data.participant?.token),
        );
      }
      if (!response.ok && data.code !== "stale_revision")
        setError(data.error ?? "Görüşme durumu güncellenemedi.");
      return data.call ?? null;
    },
    [token],
  );

  const cleanupMedia = useCallback(() => {
    stopMediaStream(localStreamRef.current);
    stopMediaStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setAudioBlocked(false);
    setAudioActivated(false);
    setPlaybackState("waiting");
    setAudioContextState("inactive");
  }, []);

  const peer = useVideoCallPeer({
    callId: call?.id ?? null,
    participantToken,
    role: "customer",
    localStream,
    iceServers,
    onRemoteStream: setRemoteStream,
    onHangup: () => void updateCall("end", "remote_hangup").then(cleanupMedia),
    onConnected: () => void updateCall("connected"),
    onReconnecting: () => void updateCall("reconnecting"),
    onFailed: () => {
      setError(
        "Görüntülü görüşme bağlantısı kurulamadı. Yazılı destek üzerinden devam edebilirsiniz.",
      );
      void updateCall("fail", "connection_failed").then(cleanupMedia);
    },
  });
  const { updateClientDiagnostics } = peer;

  useEffect(() => {
    updateClientDiagnostics({
      customerPlaybackState: playbackState,
      audioContextState,
    });
  }, [audioContextState, playbackState, updateClientDiagnostics]);

  useEffect(() => {
    if (settings?.avatar_mode !== "audio-reactive")
      setAudioContextState("inactive");
  }, [settings?.avatar_mode]);

  useEffect(() => {
    if (!call || !ACTIVE_CALL_STATUSES.has(call.status)) return;
    const timer = setInterval(() => {
      void fetch(
        `/api/live-chat/video-calls?token=${encodeURIComponent(token)}&callId=${encodeURIComponent(call.id)}`,
        { cache: "no-store" },
      )
        .then((response) => response.json() as Promise<CallResponse>)
        .then((data) => {
          if (!data.call) return;
          callRef.current = data.call;
          setCall(data.call);
          if (TERMINAL_CALL_STATUSES.has(data.call.status)) cleanupMedia();
        })
        .catch(() => undefined);
    }, 1800);
    return () => clearInterval(timer);
  }, [call, cleanupMedia, token]);

  useEffect(() => {
    if (!call?.connected_at || !settings?.max_duration_seconds) return;
    const remaining =
      new Date(call.connected_at).getTime() +
      settings.max_duration_seconds * 1000 -
      Date.now();
    const timer = setTimeout(
      () => void updateCall("end", "max_duration").then(cleanupMedia),
      Math.max(0, remaining),
    );
    return () => clearTimeout(timer);
  }, [
    call?.connected_at,
    cleanupMedia,
    settings?.max_duration_seconds,
    updateCall,
  ]);

  useEffect(() => {
    const pageHide = () => {
      const current = callRef.current;
      if (!current || !ACTIVE_CALL_STATUSES.has(current.status)) return;
      void fetch("/api/live-chat/video-calls", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          callId: current.id,
          revision: current.revision,
          action: "end",
          reason: "page_closed",
        }),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", pageHide);
    return () => window.removeEventListener("pagehide", pageHide);
  }, [token]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  async function requestCall() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Tarayıcınız görüntülü görüşmeyi desteklemiyor. Yazılı destek üzerinden devam edebilirsiniz.",
      );
      return;
    }
    setPending(true);
    setError("");
    let stream: MediaStream | null = null;
    let onlyAudio = false;
    try {
      const media = await requestCustomerMedia((constraints) =>
        navigator.mediaDevices.getUserMedia(constraints),
      );
      stream = media.stream;
      onlyAudio = media.audioOnly;
      const response = await fetch("/api/live-chat/video-calls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, conversationId }),
      });
      const data = (await response.json()) as CallResponse;
      if (!response.ok || !data.call || !data.participant)
        throw new Error(data.error ?? "Görüşme talebi gönderilemedi.");
      setLocalStream(stream);
      setAudioOnly(onlyAudio);
      setCameraEnabled(!onlyAudio);
      setMicrophoneEnabled(true);
      setCall(data.call);
      setParticipantToken(data.participant.token);
      setIceServers(data.iceServers ?? []);
      if (data.settings) setSettings(data.settings);
      setConsentOpen(false);
      setMinimized(false);
    } catch (reason) {
      stopMediaStream(stream);
      setError(
        reason instanceof Error &&
          !reason.message.toLowerCase().includes("permission")
          ? reason.message
          : "Mikrofon izni olmadan görüşme başlatılamadı. Yazılı destek üzerinden devam edebilirsiniz.",
      );
    } finally {
      setPending(false);
    }
  }

  async function endCall() {
    await peer.sendHangup();
    await updateCall("end", "customer_hangup");
    cleanupMedia();
  }

  function toggleCamera() {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }

  function toggleMicrophone() {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicrophoneEnabled(track.enabled);
  }

  async function activateAudio() {
    try {
      const audio = remoteAudioRef.current;
      if (!audio) return;
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      setAudioBlocked(false);
      setAudioActivated(true);
      setPlaybackState("playing");
    } catch {
      setAudioBlocked(true);
      setPlaybackState("blocked");
    }
  }

  if (!settings?.enabled) return null;

  return (
    <>
      {call ? <audio ref={remoteAudioRef} autoPlay playsInline /> : null}
      <button
        type="button"
        onClick={() => setConsentOpen(true)}
        disabled={Boolean(call && ACTIVE_CALL_STATUSES.has(call.status))}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        <Video className="size-4" /> Görüntülü Görüşme
      </button>

      {call && minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"
        >
          <span>{callStatusMessage(call.status)}</span>
          <Maximize2 className="size-4" />
        </button>
      ) : null}

      {consentOpen ? (
        <div
          className="fixed inset-0 z-[1020] grid place-items-center bg-zinc-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-consent-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="video-consent-title" className="text-lg font-black">
                  Görüntülü Görüşme
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Görüntülü görüşme için kamera ve mikrofon izni istenecektir.
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Görüşme kaydedilmez. Kamera izni vermezseniz sesli devam
                  edebilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConsentOpen(false)}
                disabled={pending}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100"
                aria-label="Pencereyi kapat"
              >
                <X className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => void requestCall()}
              disabled={pending}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {pending ? "İzin bekleniyor…" : "Görüşme Talebi Gönder"}
            </button>
            {error ? (
              <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {call && !minimized ? (
        <section
          className="fixed inset-0 z-[1010] flex min-h-0 flex-col bg-zinc-950 text-white sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(720px,calc(100dvh-48px))] sm:w-[min(430px,calc(100vw-24px))] sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl"
          role="dialog"
          aria-modal="false"
          aria-label="Görüntülü görüşme"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                {settings.avatar_display_name}
              </p>
              <p className="text-xs text-emerald-300" aria-live="polite">
                {callStatusMessage(call.status)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="grid size-9 place-items-center rounded-full bg-white/10"
              aria-label="Görüşmeyi küçült"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="relative min-h-0 flex-1 p-3">
            <VideoAvatar
              displayName={settings.avatar_display_name}
              imageUrl={settings.avatar_image_url}
              stream={remoteStream}
              mode={settings.avatar_mode}
              audioActivated={audioActivated}
              onAudioContextStateChange={setAudioContextState}
            />
            {!audioOnly ? (
              <video
                ref={selfVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute bottom-6 right-6 aspect-[3/4] w-24 rounded-2xl border-2 border-white/30 bg-zinc-900 object-cover shadow-xl"
                aria-label="Kendi kamera görüntünüz"
              />
            ) : (
              <span className="absolute bottom-6 right-6 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black text-zinc-950">
                Yalnız ses
              </span>
            )}
          </div>
          {audioBlocked ? (
            <button
              type="button"
              onClick={() => void activateAudio()}
              className="mx-3 mb-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-zinc-950"
            >
              Görüşme sesini başlat
            </button>
          ) : null}
          <div className="shrink-0 px-3 text-center text-[10px] text-zinc-400">
            Dijital Avatar · Görüşme kaydedilmez ·{" "}
            {peer.state === "reconnecting"
              ? "Bağlantı yenileniyor"
              : "Canlı görüşme"}
          </div>
          <div className="flex shrink-0 items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={toggleMicrophone}
              className="grid size-12 place-items-center rounded-full bg-white/10"
              aria-label={
                microphoneEnabled ? "Mikrofonu kapat" : "Mikrofonu aç"
              }
            >
              {microphoneEnabled ? (
                <Mic className="size-5" />
              ) : (
                <MicOff className="size-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                TERMINAL_CALL_STATUSES.has(call.status)
                  ? setCall(null)
                  : void endCall()
              }
              className="grid size-14 place-items-center rounded-full bg-red-600"
              aria-label={
                TERMINAL_CALL_STATUSES.has(call.status)
                  ? "Görüşme ekranını kapat"
                  : "Görüşmeyi bitir"
              }
            >
              {TERMINAL_CALL_STATUSES.has(call.status) ? (
                <Phone className="size-5" />
              ) : (
                <PhoneOff className="size-5" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              disabled={audioOnly}
              className="grid size-12 place-items-center rounded-full bg-white/10 disabled:opacity-40"
              aria-label={cameraEnabled ? "Kamerayı kapat" : "Kamerayı aç"}
            >
              {cameraEnabled ? (
                <Camera className="size-5" />
              ) : (
                <CameraOff className="size-5" />
              )}
            </button>
          </div>
          {error ? (
            <p className="px-4 pb-3 text-center text-xs font-semibold text-red-300">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
