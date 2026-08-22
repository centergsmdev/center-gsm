import {
  CheckCircle2,
  Clock3,
  PhoneMissed,
  Video,
  VideoOff,
  XCircle,
} from "lucide-react";

import {
  callHistoryDurationSeconds,
  callHistoryOutcome,
} from "@/lib/live-chat/call-history";
import { formatChatDateTime, formatChatTime } from "@/lib/format/date-time";
import { formatCallDuration } from "@/lib/live-chat/video-call";
import type { LiveChatCall } from "@/types/database";

function callHistoryCopy(call: LiveChatCall, audience: "admin" | "customer") {
  const outcome = callHistoryOutcome(call);
  if (outcome === "answered") return "Cevaplandı";
  if (outcome === "missed")
    return audience === "admin" ? "Cevapsız çağrı" : "Cevapsız görüşme";
  if (outcome === "rejected") return "Görüşme reddedildi";
  if (outcome === "failed") return "Görüşme bağlantısı kurulamadı";
  if (outcome === "cancelled")
    return audience === "admin"
      ? "Müşteri çağrıyı iptal etti"
      : "Görüşme iptal edildi";
  if (outcome === "ended") return "Görüşme sona erdi";
  if (call.status === "connected" || call.status === "reconnecting")
    return "Görüntülü görüşme devam ediyor";
  return "Görüntülü görüşme talebi";
}

function OutcomeIcon({ call }: { call: LiveChatCall }) {
  const outcome = callHistoryOutcome(call);
  if (outcome === "answered") return <CheckCircle2 className="size-4" />;
  if (outcome === "missed") return <PhoneMissed className="size-4" />;
  if (outcome === "active") return <Video className="size-4" />;
  if (outcome === "failed") return <VideoOff className="size-4" />;
  return <XCircle className="size-4" />;
}

export function CallHistoryCard({
  call,
  audience,
}: {
  call: LiveChatCall;
  audience: "admin" | "customer";
}) {
  const outcome = callHistoryOutcome(call);
  const duration = callHistoryDurationSeconds(call);
  const timestamp = call.ended_at ?? call.requested_at;
  const successful = outcome === "answered";
  const active = outcome === "active";
  const title = callHistoryCopy(call, audience);

  return (
    <article
      className={`mx-auto mb-2 w-full max-w-md rounded-2xl border px-3 py-2.5 shadow-sm ${
        successful
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : active
            ? "border-blue-200 bg-blue-50 text-blue-950"
            : "border-zinc-200 bg-white text-zinc-800"
      }`}
      aria-label={`Görüntülü görüşme: ${title}`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${
            successful
              ? "bg-emerald-600 text-white"
              : active
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-600"
          }`}
        >
          <OutcomeIcon call={call} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-black sm:text-sm">{title}</p>
          <div className="text-current/65 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs">
            <span>{formatChatTime(timestamp)}</span>
            {duration !== null ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" /> {formatCallDuration(duration)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {audience === "admin" ? (
        <details className="border-current/10 text-current/70 mt-2 border-t pt-2 text-[11px]">
          <summary className="cursor-pointer font-bold">Ayrıntılar</summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <dt className="font-bold">Talep</dt>
            <dd>{formatChatDateTime(call.requested_at)}</dd>
            {call.accepted_at ? (
              <>
                <dt className="font-bold">Cevap</dt>
                <dd>{formatChatDateTime(call.accepted_at)}</dd>
              </>
            ) : null}
            {call.connected_at ? (
              <>
                <dt className="font-bold">Bağlantı</dt>
                <dd>{formatChatDateTime(call.connected_at)}</dd>
              </>
            ) : null}
            {call.ended_at ? (
              <>
                <dt className="font-bold">Bitiş</dt>
                <dd>{formatChatDateTime(call.ended_at)}</dd>
              </>
            ) : null}
            {duration !== null ? (
              <>
                <dt className="font-bold">Süre</dt>
                <dd>{formatCallDuration(duration)}</dd>
              </>
            ) : null}
          </dl>
        </details>
      ) : null}
    </article>
  );
}
