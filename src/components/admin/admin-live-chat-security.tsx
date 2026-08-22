"use client";

import { Ban, Link2, ShieldCheck, ShieldX, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  LiveChatAbuseIdentity,
  LiveChatBlock,
  LiveChatConversation,
} from "@/types/database";

type RelatedItem = {
  conversation: LiveChatConversation;
  reasons: Array<
    "visitor" | "user" | "abuse_token" | "network" | "coarse_device"
  >;
  confidence: "strong" | "possible";
};

type SecurityData = {
  identity: LiveChatAbuseIdentity | null;
  activeBlocks: LiveChatBlock[];
  related: RelatedItem[];
  names: string[];
  summary: {
    total: number;
    strong: number;
    network: number;
    differentNames: number;
  };
};

const REASONS = [
  ["spam", "Spam"],
  ["unnecessary_messages", "Sürekli gereksiz mesaj"],
  ["harassment", "Taciz / uygunsuz davranış"],
  ["fake_names", "Sahte isimlerle tekrar bağlantı"],
  ["video_abuse", "Görüntülü görüşme kötüye kullanımı"],
  ["other", "Diğer"],
] as const;

const SIGNAL_LABELS: Record<RelatedItem["reasons"][number], string> = {
  visitor: "aynı ziyaretçi",
  user: "aynı hesap",
  abuse_token: "aynı first-party cihaz anahtarı",
  network: "aynı ağ sinyali",
  coarse_device: "yakın zamanlı kaba cihaz benzerliği",
};

export function AdminLiveChatSecurity({
  conversationId,
  customerName,
  onBlockStateChange,
}: {
  conversationId: string;
  customerName: string;
  onBlockStateChange?: (blocked: boolean) => void;
}) {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<
    "visitor" | "visitor_network" | "site"
  >("visitor_network");
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>("spam");
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [pending, setPending] = useState(false);
  const [revokeBlock, setRevokeBlock] = useState<LiveChatBlock | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/live-chat/security?conversationId=${encodeURIComponent(conversationId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as SecurityData & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Güvenlik bilgileri alınamadı.");
      setData(payload);
      onBlockStateChange?.(payload.activeBlocks.length > 0);
      if (!payload.identity?.ip_hash) setTargetMode("visitor");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Güvenlik bilgileri alınamadı.",
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, onBlockStateChange]);

  useEffect(() => void load(), [load]);

  async function createBlock() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/live-chat/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId,
          targetMode,
          reason,
          note,
          duration,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "Engel kaydedilemedi.");
      setDialogOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Engel kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }

  async function revoke() {
    if (!revokeBlock) return;
    setPending(true);
    try {
      const response = await fetch(
        `/api/admin/live-chat/blocks/${revokeBlock.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "Engel kaldırılamadı.");
      setRevokeBlock(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Engel kaldırılamadı.");
    } finally {
      setPending(false);
    }
  }

  const activeBlock = data?.activeBlocks[0] ?? null;
  return (
    <>
      <details className="border-b border-zinc-200 bg-white px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm font-black">
            {activeBlock ? (
              <ShieldX className="size-4 text-red-600" />
            ) : (
              <ShieldCheck className="size-4 text-emerald-600" />
            )}
            Kullanıcı Güvenliği
          </span>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black ${activeBlock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
          >
            {activeBlock
              ? "ENGELLENDİ"
              : data?.summary.total
                ? "KISITLI İNCELEME"
                : "NORMAL"}
          </span>
        </summary>
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-50 p-3">
            <b>İlişkili sohbet</b>
            <span className="mt-1 block text-lg font-black">
              {data?.summary.total ?? 0}
            </span>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <b>Kullanılan isim</b>
            <span className="mt-1 block text-lg font-black">
              {data?.summary.differentNames ?? 1}
            </span>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <b>Bağlantı</b>
            <span className="mt-1 block font-bold">
              {data?.identity?.network_label ?? "Sinyal yok"}
            </span>
          </div>
        </div>
        {data?.summary.total ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <p className="font-black">
              ⚠️ Bu bağlantıyla ilişkili {data.summary.total} sohbet bulundu.
            </p>
            <p className="mt-1">
              {data.summary.strong} güçlü visitor/hesap sinyali ·{" "}
              {data.summary.network} ağ sinyali
            </p>
          </div>
        ) : null}
        {data?.names.length && data.names.length > 1 ? (
          <p className="mt-3 text-zinc-600">
            <b>Kullanılan isimler:</b> {data.names.join(", ")}
          </p>
        ) : null}
        {data?.related.length ? (
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {data.related.map((item) => (
              <div
                key={item.conversation.id}
                className="rounded-xl border border-zinc-200 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <b>{item.conversation.customer_name}</b>
                  <span className="text-[10px] font-bold text-amber-700">
                    {item.confidence === "strong"
                      ? "İlişkili"
                      : "Muhtemelen ilişkili"}
                  </span>
                </div>
                <p className="mt-1 text-zinc-500">
                  <Link2 className="mr-1 inline size-3" />
                  {item.reasons.map((value) => SIGNAL_LABELS[value]).join(", ")}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {error ? (
          <p className="mt-3 text-xs font-bold text-red-600">{error}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {activeBlock ? (
            <button
              type="button"
              onClick={() => setRevokeBlock(activeBlock)}
              className="rounded-xl border border-zinc-300 px-3 py-2 font-black"
            >
              Engeli Kaldır
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 font-black text-white disabled:opacity-50"
            >
              <Ban className="size-4" />
              Kullanıcıyı Engelle
            </button>
          )}
        </div>
      </details>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-modal grid place-items-center overflow-y-auto bg-zinc-950/50 p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-user-title"
        >
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="block-user-title" className="text-lg font-black">
                  Kullanıcıyı Engelle
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {customerName} için kapsam ve süre seçin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-zinc-100"
                aria-label="Kapat"
              >
                <X className="size-4" />
              </button>
            </div>
            <fieldset className="mt-4 space-y-2">
              <legend className="mb-2 text-sm font-black">Engel kapsamı</legend>
              {[
                [
                  "visitor",
                  "Yalnız bu ziyaretçiyi engelle",
                  "Siteyi kullanmaya devam eder; canlı destek kapanır.",
                ],
                [
                  "visitor_network",
                  "Ziyaretçi + mevcut IP bağlantısını engelle",
                  "Önerilen: bu visitor ve aynı ağdaki yeni visitor’lar canlı desteğe erişemez.",
                ],
                [
                  "site",
                  "Site erişimini tamamen engelle",
                  "Ağ/IP tek başına uygulanmaz; güçlü kimlik sinyali zorunludur.",
                ],
              ].map(([value, label, help]) => (
                <label
                  key={value}
                  className={`block rounded-xl border p-3 ${targetMode === value ? "border-red-500 bg-red-50" : "border-zinc-200"}`}
                >
                  <span className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="targetMode"
                      value={value}
                      checked={targetMode === value}
                      disabled={
                        value === "visitor_network" && !data?.identity?.ip_hash
                      }
                      onChange={() => setTargetMode(value as typeof targetMode)}
                      className="mt-1"
                    />
                    <span>
                      <b className="block text-sm">
                        {label}
                        {value === "visitor_network" ? " (Önerilen)" : ""}
                      </b>
                      <span className="text-xs text-zinc-500">{help}</span>
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            {targetMode !== "visitor" ? (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                Aynı internet bağlantısını kullanan başka kişiler de bu engelden
                etkilenebilir. Site engeli yalnız IP eşleşmesiyle uygulanmaz.
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Neden
                <select
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as typeof reason)
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 font-normal"
                >
                  {REASONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Süre
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 font-normal"
                >
                  <option value="1h">1 saat</option>
                  <option value="24h">24 saat</option>
                  <option value="7d">7 gün</option>
                  <option value="permanent">Süresiz</option>
                </select>
              </label>
            </div>
            {reason === "other" ? (
              <label className="mt-3 block text-sm font-bold">
                Admin notu (opsiyonel)
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-zinc-200 p-3 font-normal"
                />
              </label>
            ) : null}
            {error ? (
              <p className="mt-3 text-xs font-bold text-red-600">{error}</p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={pending}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void createBlock()}
                disabled={pending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
              >
                {pending ? "Kaydediliyor…" : "Engeli Uygula"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {revokeBlock ? (
        <div
          className="fixed inset-0 z-modal grid place-items-center bg-zinc-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <h2 className="text-lg font-black">Engel kaldırılsın mı?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Mesaj, çağrı ve engel geçmişi korunur; kullanıcı yeniden canlı
              desteğe erişebilir.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevokeBlock(null)}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void revoke()}
                disabled={pending}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
              >
                {pending ? "Kaldırılıyor…" : "Engeli Kaldır"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
