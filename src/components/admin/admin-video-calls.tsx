"use client";

import {
  Camera,
  ChevronDown,
  Mic,
  MicOff,
  PhoneOff,
  Settings2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { useVideoCallPeer } from "@/components/live-chat/use-video-call-peer";
import {
  formatCallDuration,
  type SafePeerDiagnostics,
  type VideoCallAction,
} from "@/lib/live-chat/video-call";
import { stopMediaStream } from "@/lib/live-chat/video-realtime";
import { requestAdminMedia } from "@/lib/live-chat/video-media";
import type { PublicVideoSettings } from "@/lib/live-chat/video-server";
import type {
  LiveChatCall,
  LiveChatCallEvent,
  LiveChatVideoSettings,
} from "@/types/database";

type AdminCall = LiveChatCall & { customer_name: string };
type CallsResponse = {
  calls?: AdminCall[];
  events?: LiveChatCallEvent[];
  historyCalls?: LiveChatCall[];
  call?: LiveChatCall;
  participant?: { token: string; expiresAt: number } | null;
  iceServers?: RTCIceServer[];
  settings?: PublicVideoSettings;
  error?: string;
  code?: string;
};

type SettingsResponse = {
  settings?: LiveChatVideoSettings;
  environmentEnabled?: boolean;
  participantAuthConfigured?: boolean;
  simliPocEnabled?: boolean;
  simliConfigured?: boolean;
  error?: string;
};

export function AdminVideoCalls({
  selectedConversationId,
  onHistoryChange,
  refreshKey = 0,
}: {
  selectedConversationId: string | null;
  onHistoryChange?: (calls: LiveChatCall[]) => void;
  refreshKey?: number;
}) {
  const [calls, setCalls] = useState<AdminCall[]>([]);
  const [events, setEvents] = useState<LiveChatCallEvent[]>([]);
  const [settings, setSettings] = useState<LiveChatVideoSettings | null>(null);
  const [environmentEnabled, setEnvironmentEnabled] = useState(false);
  const [participantAuthConfigured, setParticipantAuthConfigured] =
    useState(false);
  const [simliPocEnabled, setSimliPocEnabled] = useState(false);
  const [simliConfigured, setSimliConfigured] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<{
    call: LiveChatCall;
    participantToken: string;
    iceServers: RTCIceServer[];
    publicSettings: PublicVideoSettings;
  } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [error, setError] = useState("");
  const sessionRef = useRef(session);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const customerVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  const cleanupMedia = useCallback(() => {
    stopMediaStream(localStreamRef.current);
    stopMediaStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const loadSettings = useCallback(async () => {
    const response = await fetch("/api/admin/live-chat/video-settings", {
      cache: "no-store",
    });
    const data = (await response.json()) as SettingsResponse;
    if (!response.ok) return;
    if (data.settings) setSettings(data.settings);
    setEnvironmentEnabled(data.environmentEnabled === true);
    setParticipantAuthConfigured(data.participantAuthConfigured === true);
    setSimliPocEnabled(data.simliPocEnabled === true);
    setSimliConfigured(data.simliConfigured === true);
  }, []);

  const loadCalls = useCallback(async () => {
    const query = selectedConversationId
      ? `?conversationId=${encodeURIComponent(selectedConversationId)}`
      : "";
    const response = await fetch(`/api/admin/live-chat/video-calls${query}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as CallsResponse;
    if (!response.ok) return;
    setCalls(data.calls ?? []);
    setEvents(data.events ?? []);
    onHistoryChange?.(data.historyCalls ?? []);
    const active = sessionRef.current;
    if (active) {
      const current = data.calls?.find((call) => call.id === active.call.id);
      if (current)
        setSession((value) => (value ? { ...value, call: current } : value));
      else {
        cleanupMedia();
        sessionRef.current = null;
        setSession(null);
      }
    }
  }, [cleanupMedia, onHistoryChange, selectedConversationId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadCalls();
    const timer = setInterval(() => void loadCalls(), 1800);
    return () => clearInterval(timer);
  }, [loadCalls]);

  useEffect(() => {
    if (refreshKey) void loadCalls();
  }, [loadCalls, refreshKey]);

  useEffect(() => {
    const video = customerVideoRef.current;
    if (!video || !remoteStream) return;
    video.srcObject = remoteStream;
    void video
      .play()
      .then(() => setAudioBlocked(false))
      .catch(() => setAudioBlocked(true));
  }, [remoteStream, session]);

  const updateCall = useCallback(
    async (action: VideoCallAction, reason?: string) => {
      const current = sessionRef.current;
      if (!current) return null;
      const response = await fetch("/api/admin/live-chat/video-calls", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callId: current.call.id,
          revision: current.call.revision,
          action,
          reason,
        }),
        keepalive: action === "end" || action === "fail",
      });
      const data = (await response.json()) as CallsResponse;
      if (data.call)
        setSession((value) => (value ? { ...value, call: data.call! } : value));
      if (!response.ok && data.code !== "stale_revision")
        setError(data.error ?? "Görüşme durumu güncellenemedi.");
      return data.call ?? null;
    },
    [],
  );

  const peer = useVideoCallPeer({
    callId: session?.call.id ?? null,
    participantToken: session?.participantToken ?? null,
    role: "admin",
    localStream,
    iceServers: session?.iceServers ?? [],
    onRemoteStream: setRemoteStream,
    onHangup: () =>
      void updateCall("end", "remote_hangup").then(() => {
        cleanupMedia();
        sessionRef.current = null;
        setSession(null);
        void loadCalls();
      }),
    onConnected: () => void updateCall("connected"),
    onReconnecting: () => void updateCall("reconnecting"),
    onFailed: () => {
      setError("Görüntülü görüşme medya bağlantısı kurulamadı.");
      void updateCall("fail", "connection_failed").then(cleanupMedia);
    },
  });

  useEffect(() => {
    const connectedAt = session?.call.connected_at;
    if (!connectedAt) return;
    const remaining =
      new Date(connectedAt).getTime() +
      session.publicSettings.max_duration_seconds * 1000 -
      Date.now();
    const timer = setTimeout(
      () => {
        void updateCall("end", "max_duration").then(() => {
          cleanupMedia();
          sessionRef.current = null;
          setSession(null);
        });
      },
      Math.max(0, remaining),
    );
    return () => clearTimeout(timer);
  }, [cleanupMedia, session, updateCall]);

  useEffect(() => {
    const pageHide = () => {
      if (sessionRef.current) void updateCall("end", "page_closed");
    };
    window.addEventListener("pagehide", pageHide);
    return () => window.removeEventListener("pagehide", pageHide);
  }, [updateCall]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  async function respond(call: AdminCall, action: "accept" | "reject") {
    setError("");
    const response = await fetch("/api/admin/live-chat/video-calls", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        callId: call.id,
        revision: call.revision,
        action,
      }),
    });
    const data = (await response.json()) as CallsResponse;
    if (!response.ok || !data.call) {
      setError(data.error ?? "Görüşme talebi yanıtlanamadı.");
      await loadCalls();
      return;
    }
    if (action === "reject") {
      await loadCalls();
      return;
    }
    if (!data.participant?.token || !data.settings) {
      setError("Görüşme yetkilendirmesi oluşturulamadı.");
      return;
    }
    try {
      const stream = await requestAdminMedia((constraints) =>
        navigator.mediaDevices.getUserMedia(constraints),
      );
      setLocalStream(stream);
      setMicrophoneEnabled(true);
      setSession({
        call: data.call,
        participantToken: data.participant.token,
        iceServers: data.iceServers ?? [],
        publicSettings: data.settings,
      });
    } catch {
      const failedSession = {
        call: data.call,
        participantToken: data.participant.token,
        iceServers: data.iceServers ?? [],
        publicSettings: data.settings,
      };
      sessionRef.current = failedSession;
      setSession(failedSession);
      await updateCall("fail", "admin_microphone_denied");
      sessionRef.current = null;
      setSession(null);
      setError("Mikrofon izni olmadan görüşme başlatılamadı.");
    }
  }

  async function endCall() {
    await peer.sendHangup();
    await updateCall("end", "admin_hangup");
    cleanupMedia();
    setSession(null);
    await loadCalls();
  }

  function toggleMicrophone() {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicrophoneEnabled(track.enabled);
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/live-chat/video-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: settings.enabled,
          avatarMode: settings.avatar_mode,
          avatarDisplayName: settings.avatar_display_name,
          ringTimeoutSeconds: settings.ring_timeout_seconds,
          maxDurationSeconds: settings.max_duration_seconds,
        }),
      });
      const data = (await response.json()) as SettingsResponse;
      if (!response.ok || !data.settings)
        throw new Error(data.error ?? "Ayarlar kaydedilemedi.");
      setSettings(data.settings);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Ayarlar kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSaving(true);
    const body = new FormData();
    body.set("avatar", file);
    try {
      const response = await fetch("/api/admin/live-chat/video-settings", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as SettingsResponse;
      if (!response.ok || !data.settings)
        throw new Error(data.error ?? "Avatar yüklenemedi.");
      setSettings(data.settings);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Avatar yüklenemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  const ringing = calls.filter((call) => call.status === "ringing");

  return (
    <div className="mb-4 space-y-3">
      {ringing.map((call) => (
        <div
          key={call.id}
          className="flex flex-col gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          role="status"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
              <Video className="size-5" />
            </span>
            <div>
              <p className="font-black">Görüntülü Görüşme Talebi</p>
              <p className="text-sm text-zinc-600">{call.customer_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void respond(call, "reject")}
              className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-black sm:flex-none"
            >
              Reddet
            </button>
            <button
              type="button"
              onClick={() => void respond(call, "accept")}
              disabled={Boolean(session)}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50 sm:flex-none"
            >
              Kabul Et
            </button>
          </div>
        </div>
      ))}

      <details
        open={settingsOpen}
        onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
        className="rounded-2xl border border-zinc-200 bg-white"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-black">
          <span className="flex items-center gap-2">
            <Settings2 className="size-4 text-red-600" /> Görüntülü görüşme
            ayarları
          </span>
          <ChevronDown
            className={`size-4 transition ${settingsOpen ? "rotate-180" : ""}`}
          />
        </summary>
        {settings ? (
          <div className="grid gap-4 border-t border-zinc-200 p-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-bold">
              Aktif/Pasif
              <select
                value={settings.enabled ? "on" : "off"}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    enabled: event.target.value === "on",
                  })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm"
              >
                <option value="off">Pasif</option>
                <option value="on">Aktif</option>
              </select>
            </label>
            <label className="text-xs font-bold">
              Avatar modu
              <select
                value={settings.avatar_mode}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    avatar_mode: event.target
                      .value as LiveChatVideoSettings["avatar_mode"],
                  })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm"
              >
                <option value="static">Static</option>
                <option value="audio-reactive">Audio Reactive</option>
                <option value="simli-trinity" disabled={!simliConfigured}>
                  Simli Trinity (PoC/Test)
                </option>
              </select>
            </label>
            <label className="text-xs font-bold">
              Görünen ad
              <input
                value={settings.avatar_display_name}
                maxLength={80}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    avatar_display_name: event.target.value,
                  })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-bold">
              Bekleme süresi (sn)
              <input
                type="number"
                min={15}
                max={120}
                value={settings.ring_timeout_seconds}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    ring_timeout_seconds: Number(event.target.value),
                  })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-bold">
              Maksimum süre (sn)
              <input
                type="number"
                min={60}
                max={3600}
                value={settings.max_duration_seconds}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    max_duration_seconds: Number(event.target.value),
                  })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm"
              />
            </label>
            <div className="text-xs font-bold">
              Avatar görseli
              <label className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm">
                <Upload className="size-4" /> Görsel yükle
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void uploadAvatar(event)}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-3">
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? "Kaydediliyor…" : "Ayarları kaydet"}
              </button>
              <span
                className={`text-xs font-bold ${environmentEnabled ? "text-emerald-600" : "text-amber-600"}`}
              >
                Production feature flag:{" "}
                {environmentEnabled ? "Açık" : "Kapalı"}
              </span>
              <span
                className={`text-xs font-bold ${participantAuthConfigured ? "text-emerald-600" : "text-amber-600"}`}
              >
                Geçici yetkilendirme:{" "}
                {participantAuthConfigured
                  ? "Hazır"
                  : "SUPABASE_JWT_SECRET bekleniyor"}
              </span>
              <span
                className={`text-xs font-bold ${simliConfigured ? "text-emerald-600" : "text-amber-600"}`}
              >
                Simli Trinity:{" "}
                {simliConfigured
                  ? "Hazır"
                  : simliPocEnabled
                    ? "API key/Face ID bekleniyor"
                    : "PoC kapalı"}
              </span>
            </div>
          </div>
        ) : null}
      </details>

      {events.length ? (
        <details className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-xs font-black">
            Görüntülü görüşme geçmişi ({events.length})
          </summary>
          <div className="mt-3 space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs"
              >
                <span className="font-bold">{eventLabel(event)}</span>
                <span className="text-zinc-500">
                  {new Date(event.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {session ? (
        <section
          className="fixed inset-0 z-modal flex min-h-0 flex-col bg-zinc-950 text-white lg:inset-6 lg:ml-auto lg:max-w-3xl lg:rounded-3xl lg:border lg:border-white/10 lg:shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Müşteri görüntülü görüşmesi"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:py-4">
            <div>
              <p className="font-black">Müşteri görüntüsü</p>
              <p className="text-xs text-emerald-300" aria-live="polite">
                {peer.state === "connected"
                  ? "Bağlandı"
                  : peer.state === "reconnecting"
                    ? "Yeniden bağlanıyor"
                    : "Bağlanıyor"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void endCall()}
              className="grid size-10 place-items-center rounded-full bg-white/10"
              aria-label="Görüşmeyi kapat"
            >
              <X className="size-4" />
            </button>
          </header>
          <PeerDiagnosticPanel
            local={peer.diagnostics}
            remote={peer.remoteDiagnostics}
          />
          <div className="relative min-h-0 flex-1 bg-black">
            <video
              ref={customerVideoRef}
              autoPlay
              playsInline
              className="size-full object-contain"
              aria-label="Müşteri kamera görüntüsü"
            />
            {!remoteStream?.getVideoTracks().length ? (
              <div className="absolute inset-0 grid place-items-center text-center text-zinc-400">
                <div>
                  <Camera className="mx-auto mb-3 size-10" />
                  <p className="font-bold">Müşteri yalnız ses ile bağlandı</p>
                </div>
              </div>
            ) : null}
          </div>
          {audioBlocked ? (
            <button
              type="button"
              onClick={() =>
                void customerVideoRef.current
                  ?.play()
                  .then(() => setAudioBlocked(false))
              }
              className="mx-4 mt-3 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-zinc-950"
            >
              Müşteri sesini başlat
            </button>
          ) : null}
          <div className="flex shrink-0 items-center justify-center gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
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
              onClick={() => void endCall()}
              className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-black"
              aria-label="Görüşmeyi bitir"
            >
              <PhoneOff className="size-5" /> Görüşmeyi Bitir
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PeerDiagnosticPanel({
  local,
  remote,
}: {
  local: SafePeerDiagnostics;
  remote: SafePeerDiagnostics | null;
}) {
  const customerMediaReady =
    remote?.localMediaReady ||
    local.remoteAudioReceived ||
    local.remoteVideoReceived;
  const iceLabel =
    local.iceConnectionState === "connected" ||
    local.iceConnectionState === "completed"
      ? "Connected"
      : local.iceConnectionState === "failed"
        ? "Failed"
        : local.iceConnectionState === "checking"
          ? "Checking"
          : "Waiting";
  const connectionLabel =
    local.connectionState === "connected"
      ? "Connected"
      : local.connectionState === "failed"
        ? "Failed"
        : local.connectionState === "connecting"
          ? "Connecting"
          : "Waiting";
  const candidateLabel = (
    values: SafePeerDiagnostics["localCandidateTypes"],
  ) => (values.length ? values.join(", ") : "Waiting");
  const adminMicrophoneLabel =
    local.localAudioTrackReadyState !== "live"
      ? "Missing"
      : !local.localAudioTrackEnabled || local.localAudioTrackMuted
        ? "Muted"
        : "Ready";
  const playbackLabels: Record<
    SafePeerDiagnostics["customerPlaybackState"],
    string
  > = {
    waiting: "Waiting",
    playing: "Playing",
    blocked: "Blocked",
    muted: "Muted",
    failed: "Failed",
  };
  const contextLabels: Record<
    SafePeerDiagnostics["audioContextState"],
    string
  > = {
    inactive: "Inactive",
    running: "Running",
    suspended: "Suspended",
    interrupted: "Suspended",
    closed: "Closed",
  };

  return (
    <div className="grid shrink-0 grid-cols-2 gap-1.5 border-b border-white/10 bg-zinc-900 px-3 py-2 text-[10px] sm:grid-cols-3">
      <DiagnosticValue
        label="Signaling"
        value={
          local.channelState === "connected"
            ? "Connected"
            : local.channelState === "failed"
              ? "Failed"
              : "Connecting"
        }
      />
      <DiagnosticValue
        label="Customer media"
        value={customerMediaReady ? "Ready" : "Waiting"}
      />
      <DiagnosticValue label="ICE" value={iceLabel} />
      <DiagnosticValue
        label="Remote video"
        value={local.remoteVideoReceived ? "Received" : "Waiting"}
      />
      <DiagnosticValue
        label="Remote audio"
        value={local.remoteAudioReceived ? "Received" : "Waiting"}
      />
      <DiagnosticValue label="Connection" value={connectionLabel} />
      <DiagnosticValue
        label="Offer / Answer"
        value={`${local.offerReceived ? "Offer ✓" : "Offer …"} · ${local.answerSent ? "Answer ✓" : "Answer …"}`}
      />
      <DiagnosticValue
        label="Customer candidates"
        value={candidateLabel(remote?.localCandidateTypes ?? [])}
      />
      <DiagnosticValue
        label="Admin candidates"
        value={candidateLabel(local.localCandidateTypes)}
      />
      <DiagnosticValue label="Admin microphone" value={adminMicrophoneLabel} />
      <DiagnosticValue
        label="Admin audio sender"
        value={local.audioSenderPresent ? "Sending" : "Missing"}
      />
      <DiagnosticValue
        label="Audio negotiation"
        value={local.audioNegotiationDirection}
      />
      <DiagnosticValue
        label="Customer remote audio"
        value={remote?.remoteAudioReceived ? "Received" : "Waiting"}
      />
      <DiagnosticValue
        label="Customer playback"
        value={
          remote ? playbackLabels[remote.customerPlaybackState] : "Waiting"
        }
      />
      <DiagnosticValue
        label="AudioContext"
        value={remote ? contextLabels[remote.audioContextState] : "Waiting"}
      />
      <DiagnosticValue
        label="Admin outbound audio"
        value={`${local.outboundAudioPacketsSent} packets · ${local.outboundAudioBytesSent} bytes`}
      />
      <DiagnosticValue
        label="Customer inbound audio"
        value={`${remote?.inboundAudioPacketsReceived ?? 0} packets · ${remote?.inboundAudioBytesReceived ?? 0} bytes`}
      />
      <DiagnosticValue
        label="Simli mode"
        value={remote?.avatarMode === "simli-trinity" ? "Active" : "Inactive"}
      />
      <DiagnosticValue
        label="Simli session"
        value={remote?.simliSessionState ?? "Waiting"}
      />
      <DiagnosticValue
        label="Face"
        value={remote?.simliFaceLoaded ? "Loaded" : "Waiting"}
      />
      <DiagnosticValue
        label="Audio source"
        value={
          remote?.simliAudioSourceState === "attached"
            ? "Attached"
            : remote?.simliAudioSourceState === "missing"
              ? "Missing"
              : "Waiting"
        }
      />
      <DiagnosticValue
        label="Simli input track"
        value={
          remote
            ? `audio · ${remote.simliAudioTrackReadyState} · ${remote.simliAudioTrackEnabled ? "enabled" : "disabled"} · ${remote.simliAudioTrackMuted ? "muted" : "unmuted"}`
            : "Waiting"
        }
      />
      <DiagnosticValue
        label="Simli audio input"
        value={
          remote?.simliAudioInputState === "flowing"
            ? "Flowing"
            : remote?.simliAudioInputState === "failed"
              ? "Failed"
              : remote?.simliAudioInputState === "silent"
                ? "Silent"
                : "Waiting"
        }
      />
      <DiagnosticValue
        label="Input level"
        value={
          remote?.simliInputLevelState === "active"
            ? "Active"
            : remote?.simliInputLevelState === "silent"
              ? "Silent"
              : "Waiting"
        }
      />
      <DiagnosticValue
        label="Simli AudioContext"
        value={
          remote ? contextLabels[remote.simliAudioContextState] : "Waiting"
        }
      />
      <DiagnosticValue
        label="Simli input data"
        value={`${remote?.simliAudioChunksSent ?? 0} chunks · ${remote?.simliAudioBytesSent ?? 0} bytes`}
      />
      <DiagnosticValue
        label="Simli input ACK"
        value={`${remote?.simliAudioAckCount ?? 0}`}
      />
      <DiagnosticValue
        label="Avatar source"
        value={
          remote?.simliAvatarSource === "simli-video"
            ? "Simli Video"
            : "Static Fallback"
        }
      />
      <DiagnosticValue
        label="Avatar video"
        value={
          remote?.simliAvatarVideoState === "received" ? "Received" : "Waiting"
        }
      />
      <DiagnosticValue
        label="Avatar playback"
        value={
          remote?.simliAvatarPlaybackState === "playing"
            ? "Playing"
            : remote?.simliAvatarPlaybackState === "failed"
              ? "Failed"
              : "Waiting"
        }
      />
      <DiagnosticValue
        label="Avatar fallback"
        value={remote?.simliFallbackActive ? "Active" : "Inactive"}
      />
      <DiagnosticValue
        label="Video frames / bytes"
        value={`${remote?.simliVideoFramesReceived ?? 0} frames · ${remote?.simliVideoBytesReceived == null ? "N/A" : `${remote.simliVideoBytesReceived} bytes`}`}
      />
      <DiagnosticValue
        label="Video currentTime"
        value={`${remote?.simliVideoPlaybackTimeMs ?? 0} ms`}
      />
      <DiagnosticValue
        label="Session ready"
        value={
          remote?.simliSessionReadyMs != null
            ? `${remote.simliSessionReadyMs} ms`
            : "Waiting"
        }
      />
      <DiagnosticValue
        label="Input → first frame"
        value={
          remote?.simliFirstFrameMs != null
            ? `${remote.simliFirstFrameMs} ms`
            : "Waiting"
        }
      />
      <DiagnosticValue
        label="Approx avatar latency"
        value={
          remote?.simliApproxAvatarLatencyMs != null
            ? `${remote.simliApproxAvatarLatencyMs} ms`
            : "Waiting"
        }
      />
    </div>
  );
}

function DiagnosticValue({ label, value }: { label: string; value: string }) {
  const positive =
    /Connected|Ready|Received|Playing|Running|Sending|Attached|Flowing|Loaded|Simli Video|Active|sendrecv|sendonly|✓|srflx|relay/.test(
      value,
    );
  const failed = /Failed|Missing|Blocked|Muted/.test(value);
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <span className="block text-zinc-500">{label}</span>
      <span
        className={`font-bold ${failed ? "text-red-300" : positive ? "text-emerald-300" : "text-amber-200"}`}
      >
        {value}
      </span>
    </div>
  );
}

function eventLabel(event: LiveChatCallEvent) {
  const labels: Record<LiveChatCallEvent["event_type"], string> = {
    requested: "Görüntülü görüşme talep edildi",
    accepted: "Görüşme kabul edildi",
    connecting: "Görüşme bağlanıyor",
    started: "Görüşme başladı",
    reconnecting: "Bağlantı yeniden kuruluyor",
    ended: `Görüşme sona erdi · Süre: ${formatCallDuration(Number((event.metadata as { durationSeconds?: number })?.durationSeconds ?? 0))}`,
    rejected: "Görüşme reddedildi",
    missed: "Görüşme yanıtlanmadı",
    failed: "Görüşme bağlantısı başarısız",
  };
  return labels[event.event_type];
}
