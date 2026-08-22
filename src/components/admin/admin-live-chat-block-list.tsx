"use client";

import { ShieldOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { formatChatDateTime } from "@/lib/format/date-time";
import type { LiveChatBlock } from "@/types/database";

type BlockRow = LiveChatBlock & {
  admin_name: string;
  related_count: number;
  active: boolean;
};

const REASON_LABEL: Record<LiveChatBlock["reason"], string> = {
  spam: "Spam",
  unnecessary_messages: "Sürekli gereksiz mesaj",
  harassment: "Taciz / uygunsuz davranış",
  fake_names: "Sahte isimlerle tekrar bağlantı",
  video_abuse: "Görüntülü görüşme kötüye kullanımı",
  other: "Diğer",
};

export function AdminLiveChatBlockList() {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BlockRow | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/live-chat/blocks", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      blocks?: BlockRow[];
      error?: string;
    };
    if (!response.ok) setError(payload.error ?? "Engel listesi alınamadı.");
    else setBlocks(payload.blocks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => void load(), [load]);

  async function revoke() {
    if (!selected) return;
    setPending(true);
    const response = await fetch(`/api/admin/live-chat/blocks/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) setError(payload.error ?? "Engel kaldırılamadı.");
    else {
      setSelected(null);
      await load();
    }
    setPending(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4 sm:p-6">
        <h2 className="text-lg font-black">Engel Geçmişi</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Aktif, süresi dolmuş ve kaldırılmış kayıtlar denetim amacıyla korunur.
        </p>
      </div>
      {error ? (
        <p className="m-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 p-3 sm:p-4 lg:hidden">
        {blocks.map((block) => (
          <article
            key={block.id}
            className="rounded-xl border border-zinc-200 p-4 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <b>{block.display_name_snapshot ?? "Ziyaretçi"}</b>
                <p className="text-xs text-zinc-500">
                  {formatChatDateTime(block.created_at)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black ${block.active ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"}`}
              >
                {block.active
                  ? "AKTİF"
                  : block.revoked_at
                    ? "KALDIRILDI"
                    : "SÜRESİ DOLDU"}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-zinc-500">Kapsam</dt>
                <dd className="font-bold">
                  {block.scope === "chat" ? "Canlı destek" : "Site erişimi"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Bağlantı</dt>
                <dd className="font-bold">{block.network_label ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Neden</dt>
                <dd className="font-bold">{REASON_LABEL[block.reason]}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">İlişkili</dt>
                <dd className="font-bold">{block.related_count} sohbet</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-zinc-500">Admin</dt>
                <dd className="break-all font-bold">{block.admin_name}</dd>
              </div>
            </dl>
            {block.active ? (
              <button
                type="button"
                onClick={() => setSelected(block)}
                className="mt-3 w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black"
              >
                Engeli Kaldır
              </button>
            ) : null}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="p-4">Tarih / İsim</th>
              <th className="p-4">Kapsam</th>
              <th className="p-4">Bağlantı</th>
              <th className="p-4">Neden</th>
              <th className="p-4">Admin</th>
              <th className="p-4">Durum</th>
              <th className="p-4">İlişkili</th>
              <th className="p-4">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block.id} className="border-t border-zinc-100">
                <td className="p-4">
                  <b className="block">
                    {block.display_name_snapshot ?? "Ziyaretçi"}
                  </b>
                  <span className="text-xs text-zinc-500">
                    {formatChatDateTime(block.created_at)}
                  </span>
                </td>
                <td className="p-4 font-bold">
                  {block.scope === "chat" ? "Canlı destek" : "Site erişimi"}
                </td>
                <td className="p-4">{block.network_label ?? "—"}</td>
                <td className="p-4">{REASON_LABEL[block.reason]}</td>
                <td className="p-4">{block.admin_name}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black ${block.active ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"}`}
                  >
                    {block.active
                      ? "AKTİF"
                      : block.revoked_at
                        ? "KALDIRILDI"
                        : "SÜRESİ DOLDU"}
                  </span>
                </td>
                <td className="p-4 font-bold">{block.related_count}</td>
                <td className="p-4">
                  {block.active ? (
                    <button
                      type="button"
                      onClick={() => setSelected(block)}
                      className="rounded-lg border px-3 py-2 text-xs font-black"
                    >
                      Engeli Kaldır
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !blocks.length ? (
        <div className="grid place-items-center p-12 text-center text-zinc-500">
          <ShieldOff className="mb-2 size-8" />
          <p>Henüz engel kaydı yok.</p>
        </div>
      ) : null}
      {loading ? (
        <p className="p-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
      ) : null}
      {selected ? (
        <div
          className="fixed inset-0 z-modal grid place-items-center bg-zinc-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <h2 className="text-lg font-black">Engel kaldırılsın mı?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              {selected.display_name_snapshot ?? "Bu ziyaretçi"} yeniden
              erişebilecek. Geçmiş kayıt silinmeyecek.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
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
    </div>
  );
}
