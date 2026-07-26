"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  addReturnMessage,
  getReturnBundle,
  RETURN_REASONS,
  RETURN_STATUSES,
  updateReturnStatus,
} from "@/lib/returns";
import type { ReturnStatus, Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { refundToStoreCredit } from "@/lib/credits";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
type Bundle = {
  request: Tables<"return_requests">;
  items: Tables<"return_request_items">[];
  messages: Tables<"return_messages">[];
  history: Tables<"return_status_history">[];
  attachments: Tables<"return_attachments">[];
};
export function ReturnDetail({ admin = false }: { admin?: boolean }) {
  const { id } = useParams<{ id: string }>(),
    [data, setData] = useState<Bundle | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [internal, setInternal] = useState(""),
    [customerNote, setCustomerNote] = useState(""),
    [status, setStatus] = useState<ReturnStatus>("new"),
    [busy, setBusy] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const load = useCallback(async () => {
    const r = await getReturnBundle(id);
    setData(r.data);
    setError(r.error ?? "");
    if (r.data) setStatus(r.data.request.status);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function send(isInternal = false) {
    const text = isInternal ? internal : message;
    if (!text.trim()) return;
    setBusy(true);
    const r = await addReturnMessage(id, text, isInternal);
    if (r.data) {
      if (isInternal) setInternal("");
      else setMessage("");
      await load();
    } else setError(r.error ?? "");
    setBusy(false);
  }
  async function save() {
    setBusy(true);
    const r = await updateReturnStatus(id, status, internal, customerNote);
    if (r.data) {
      setInternal("");
      setCustomerNote("");
      await load();
    } else setError(r.error ?? "");
    setBusy(false);
  }
  async function creditRefund() {
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Geçerli bir iade tutarı girin.");
      return;
    }
    setBusy(true);
    const result = await refundToStoreCredit(r.order_id, r.id, amount);
    if (result.data !== null) {
      setRefundAmount("");
      setError("");
    } else setError(result.error ?? "");
    setBusy(false);
  }
  if (!data && !error) return <Skeleton className="h-96 rounded-xl" />;
  if (error || !data)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">
        {error || "Talep bulunamadı."}
      </p>
    );
  const r = data.request;
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-muted">RMA numarası</p>
              <h2 className="text-xl font-black">{r.rma_number}</h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-black">
              {RETURN_STATUSES[r.status]}
            </span>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Sebep</dt>
              <dd className="font-bold">{RETURN_REASONS[r.reason]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Talep türü</dt>
              <dd className="font-bold">{r.request_type}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm leading-6">
            {r.description}
          </p>
          {data.attachments.length ? (
            <div className="mt-5">
              <h3 className="text-sm font-black">Ekler</h3>
              <ul className="mt-2 space-y-2">
                {data.attachments.map((file) => (
                  <li key={file.id} className="rounded-lg border p-3 text-sm">
                    <span className="font-bold">{file.file_name}</span>
                    <span className="ml-2 text-xs text-muted">
                      {Math.ceil(file.file_size / 1024)} KB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
        <Card className="p-5">
          <h3 className="font-black">Mesajlar</h3>
          <div className="my-4 space-y-3">
            {data.messages
              .filter((x) => admin || !x.is_internal)
              .map((x) => (
                <div
                  key={x.id}
                  className={`rounded-xl p-3 text-sm ${x.is_internal ? "bg-amber-50" : "bg-zinc-50"}`}
                >
                  <p className="text-xs font-bold text-muted">
                    {x.sender_role === "admin" ? "CENTER GSM" : "Müşteri"}
                    {x.is_internal ? " · İç not" : ""}
                  </p>
                  <p className="mt-1">{x.message}</p>
                </div>
              ))}
          </div>
          <textarea
            className="min-h-24 w-full rounded-xl border p-3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mesajınızı yazın…"
          />
          <Button
            className="mt-3"
            type="button"
            disabled={busy}
            onClick={() => void send()}
          >
            Mesaj gönder
          </Button>
        </Card>
      </div>
      <aside className="space-y-5">
        {admin ? (
          <Card className="p-5">
            <h3 className="font-black">Talebi yönet</h3>
            <select
              className="mt-4 h-11 w-full rounded-xl border px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReturnStatus)}
            >
              {Object.entries(RETURN_STATUSES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <textarea
              className="mt-3 min-h-20 w-full rounded-xl border p-3"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Müşteriye not"
            />
            <textarea
              className="mt-3 min-h-20 w-full rounded-xl border p-3"
              value={internal}
              onChange={(e) => setInternal(e.target.value)}
              placeholder="İç not"
            />
            <div className="mt-3 flex gap-2">
              <Button type="button" disabled={busy} onClick={() => void save()}>
                Kaydet
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !internal.trim()}
                onClick={() => void send(true)}
              >
                İç not ekle
              </Button>
            </div>
          </Card>
        ) : null}
        {admin ? (
          <Card className="p-5">
            <h3 className="font-black">İade yöntemi</h3>
            <p className="mt-2 text-xs text-muted">
              Para iadesi ödeme sistemi üzerinden yönetilir. Alternatif olarak
              müşteriye mağaza bakiyesi tanımlayın.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border px-3"
                type="number"
                min="0.01"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="İade tutarı"
              />
              <Button
                type="button"
                disabled={busy}
                onClick={() => void creditRefund()}
              >
                Store Credit İade
              </Button>
            </div>
          </Card>
        ) : null}
        <Card className="p-5">
          <h3 className="font-black">Durum geçmişi</h3>
          <ol className="mt-4 space-y-4">
            {data.history.map((x) => (
              <li key={x.id} className="border-l-2 border-red-200 pl-3">
                <p className="text-sm font-bold">
                  {RETURN_STATUSES[x.to_status as ReturnStatus] ?? x.to_status}
                </p>
                <p className="text-xs text-muted">
                  {new Date(x.created_at).toLocaleString("tr-TR")}
                </p>
                {x.note ? <p className="mt-1 text-xs">{x.note}</p> : null}
              </li>
            ))}
          </ol>
        </Card>
      </aside>
    </div>
  );
}
