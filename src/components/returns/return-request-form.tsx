"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createReturnRequest,
  RETURN_ACCEPT,
  RETURN_MAX_FILE_SIZE,
  RETURN_REASONS,
  uploadReturnFiles,
} from "@/lib/returns";
import type { ReturnReason, Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
export function ReturnRequestForm() {
  const router = useRouter(),
    params = useSearchParams(),
    orderId = params.get("orderId") ?? "";
  const [items, setItems] = useState<Tables<"order_items">[]>([]),
    [selected, setSelected] = useState<Record<string, number>>({}),
    [reason, setReason] = useState<ReturnReason>("wrong_product"),
    [description, setDescription] = useState(""),
    [requestType, setRequestType] = useState<
      "return" | "exchange" | "warranty"
    >("return"),
    [files, setFiles] = useState<File[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const db = createClient();
    if (!db || !orderId) return;
    void db
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .then((r) => {
        if (!r.error) setItems(r.data);
      });
  }, [orderId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = Object.entries(selected)
      .filter(([, q]) => q > 0)
      .map(([order_item_id, quantity]) => ({ order_item_id, quantity }));
    if (!orderId || !chosen.length || description.trim().length < 10) {
      setError("Ürün seçin ve en az 10 karakter açıklama yazın.");
      return;
    }
    if (files.some((f) => f.size > RETURN_MAX_FILE_SIZE)) {
      setError("Dosya boyutu en fazla 50 MB olabilir.");
      return;
    }
    setBusy(true);
    const result = await createReturnRequest({
      orderId,
      reason,
      description,
      requestType,
      items: chosen,
    });
    if (!result.data) {
      setError(result.error ?? "");
      setBusy(false);
      return;
    }
    if (files.length) {
      const uploaded = await uploadReturnFiles(result.data, files);
      if (!uploaded.data)
        setError("Talep oluşturuldu ancak bazı dosyalar yüklenemedi.");
    }
    router.push(`/hesabim/iadeler/${result.data}`);
    router.refresh();
  }
  return (
    <Card className="p-5 sm:p-7">
      <form onSubmit={submit} className="space-y-6">
        <fieldset>
          <legend className="font-black">Talep türü</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["return", "İade"],
              ["exchange", "Değişim"],
              ["warranty", "Garanti"],
            ].map(([v, l]) => (
              <label
                key={v}
                className="rounded-xl border p-3 text-sm font-bold"
              >
                <input
                  type="radio"
                  className="mr-2"
                  checked={requestType === v}
                  onChange={() => setRequestType(v as typeof requestType)}
                />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-black">Ürünler</legend>
          <div className="mt-3 space-y-2">
            {items.map((x) => (
              <label
                key={x.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <span>
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={(selected[x.id] ?? 0) > 0}
                    onChange={(e) =>
                      setSelected((s) => ({
                        ...s,
                        [x.id]: e.target.checked ? 1 : 0,
                      }))
                    }
                  />
                  {x.product_name}
                </span>
                {selected[x.id] ? (
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    max={x.quantity}
                    value={selected[x.id]}
                    onChange={(e) =>
                      setSelected((s) => ({
                        ...s,
                        [x.id]: Number(e.target.value),
                      }))
                    }
                  />
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-bold">
          Sebep
          <select
            className="mt-2 h-11 w-full rounded-xl border px-3"
            value={reason}
            onChange={(e) => setReason(e.target.value as ReturnReason)}
          >
            {Object.entries(RETURN_REASONS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          Açıklama
          <textarea
            className="mt-2 min-h-32 w-full rounded-xl border p-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            required
          />
        </label>
        <label className="block text-sm font-bold">
          Fotoğraf, video veya PDF
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            accept={RETURN_ACCEPT}
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            Dosya başına en fazla 50 MB.
          </span>
        </label>
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Talep oluşturuluyor…" : "Talebi oluştur"}
        </Button>
      </form>
    </Card>
  );
}
