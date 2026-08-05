"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { LiveChatConversation, LiveChatMessage } from "@/types/database";

const TOKEN_KEY = "center-gsm-live-chat-token";
const NAME_KEY = "center-gsm-live-chat-name";

type ChatResponse = {
  conversation: LiveChatConversation | null;
  messages?: LiveChatMessage[];
  message?: LiveChatMessage;
  error?: string;
};

export function LiveChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<LiveChatConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedToken = window.localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      storedToken = crypto.randomUUID();
      window.localStorage.setItem(TOKEN_KEY, storedToken);
    }
    setToken(storedToken);
    setName(window.localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  useEffect(() => {
    if (!open || !token) return;
    void fetch(`/api/live-chat?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then((response) => response.json() as Promise<ChatResponse>)
      .then((data) => {
        setConversation(data.conversation);
        setMessages(data.messages ?? []);
      })
      .catch(() => setError("Sohbet geçmişi yüklenemedi."));
  }, [open, token]);

  useEffect(() => {
    if (!token) return;
    const client = createClient();
    if (!client) return;
    const channel = client
      .channel(`live-chat:${token}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const incoming = payload as LiveChatMessage;
        if (!incoming?.id) return;
        setMessages((current) =>
          current.some((item) => item.id === incoming.id)
            ? current
            : [...current, incoming],
        );
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanMessage = message.trim();
    if (!token || cleanName.length < 2 || !cleanMessage) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name: cleanName, message: cleanMessage }),
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok || !data.message)
        throw new Error(data.error ?? "Mesaj gönderilemedi.");
      window.localStorage.setItem(NAME_KEY, cleanName);
      setConversation(data.conversation);
      setMessages((current) => [...current, data.message!]);
      setMessage("");
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Mesaj gönderilemedi.",
      );
    } finally {
      setSending(false);
    }
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-dropdown sm:bottom-6 sm:right-6">
      {open ? (
        <section className="mb-3 flex h-[min(520px,calc(100dvh-100px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <header className="flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
            <div>
              <h2 className="font-black">Canlı Destek</h2>
              <p className="text-xs text-zinc-400">
                Size nasıl yardımcı olabiliriz?
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-full bg-white/10"
              aria-label="Sohbeti kapat"
            >
              <X className="size-4" />
            </button>
          </header>
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4"
          >
            {messages.length ? (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    item.sender === "customer"
                      ? "ml-auto bg-red-600 text-white"
                      : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {item.body}
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-600">
                Merhaba, mesajınızı bırakın. Ekibimiz buradan yanıtlayacaktır.
              </p>
            )}
          </div>
          <form
            onSubmit={send}
            className="space-y-2 border-t border-zinc-200 p-3"
          >
            {!conversation ? (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Adınız"
                maxLength={80}
                required
                className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-red-500"
              />
            ) : null}
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Mesajınızı yazın…"
                maxLength={2000}
                rows={2}
                required
                className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={sending}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white disabled:opacity-50"
                aria-label="Mesajı gönder"
              >
                <Send className="size-4" />
              </button>
            </div>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </form>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="ml-auto flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-bold text-white shadow-xl transition hover:bg-red-600"
        aria-label="Canlı desteği aç"
      >
        <MessageCircle className="size-5" />
        Canlı Destek
      </button>
    </div>
  );
}
