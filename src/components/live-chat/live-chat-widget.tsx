"use client";

import { ImagePlus, MessageCircle, Send, Smile, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { LiveChatConversation, LiveChatMessage } from "@/types/database";

const TOKEN_KEY = "center-gsm-live-chat-token";
const NAME_KEY = "center-gsm-live-chat-name";
const EMOJIS = ["😊", "👍", "🙏", "❤️", "📦", "✅"];

type ChatMessage = LiveChatMessage & { attachment_url?: string | null };
type ChatResponse = {
  conversation: LiveChatConversation | null;
  messages?: ChatMessage[];
  message?: ChatMessage;
  error?: string;
};

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Bugün";
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export function LiveChatWidget() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<LiveChatConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatChannelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof createClient>>["channel"]
  > | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const loadChat = useCallback(async () => {
    if (!token) return;
    const response = await fetch(
      `/api/live-chat?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as ChatResponse;
    if (!response.ok)
      throw new Error(data.error ?? "Sohbet geçmişi yüklenemedi.");
    setConversation(data.conversation);
    setMessages(data.messages ?? []);
    if (open && data.conversation) {
      await fetch("/api/live-chat", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, conversationId: data.conversation.id }),
      });
      await chatChannelRef.current?.send({
        type: "broadcast",
        event: "read",
        payload: { role: "customer" },
      });
    }
  }, [open, token]);

  useEffect(() => {
    if (isAdminPage) return;
    let storedToken = window.localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      storedToken = crypto.randomUUID();
      window.localStorage.setItem(TOKEN_KEY, storedToken);
    }
    setToken(storedToken);
    setName(window.localStorage.getItem(NAME_KEY) ?? "");
  }, [isAdminPage]);

  useEffect(() => {
    if (isAdminPage || !open || !token) return;
    void loadChat().catch((reason: unknown) =>
      setError(
        reason instanceof Error
          ? reason.message
          : "Sohbet geçmişi yüklenemedi.",
      ),
    );
  }, [isAdminPage, loadChat, open, token]);

  useEffect(() => {
    if (isAdminPage) return;
    const client = createClient();
    if (!client || !token) return;
    const channel = client
      .channel(`live-chat:${token}`)
      .on("broadcast", { event: "message" }, () => void loadChat())
      .on("broadcast", { event: "read" }, () => void loadChat())
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.role !== "admin" && payload?.role !== "ai") return;
        setAdminTyping(Boolean(payload.typing));
      })
      .subscribe();
    chatChannelRef.current = channel;
    return () => {
      chatChannelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [isAdminPage, loadChat, token]);

  useEffect(() => {
    if (isAdminPage) return;
    const client = createClient();
    if (!client) return;
    const channel = client
      .channel("live-chat-support", {
        config: { presence: { key: `customer-${token || "pending"}` } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ role?: string }>();
        setAdminOnline(
          Object.values(state)
            .flat()
            .some((presence) => presence.role === "admin"),
        );
      })
      .subscribe();
    return () => void client.removeChannel(channel);
  }, [isAdminPage, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [adminTyping, messages]);

  function publishTyping(value: string) {
    setMessage(value);
    const now = Date.now();
    if (now - lastTypingSent.current > 900) {
      lastTypingSent.current = now;
      void chatChannelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { role: "customer", typing: true },
      });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void chatChannelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { role: "customer", typing: false },
      });
    }, 1400);
  }

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
      void fetch("/api/live-chat/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, messageId: data.message.id }),
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Mesaj gönderilemedi.",
      );
    } finally {
      setSending(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token || name.trim().length < 2) {
      if (file) setError("Görsel göndermeden önce adınızı yazın.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("name", name.trim());
      form.set("message", message.trim());
      form.set("file", file);
      const response = await fetch("/api/live-chat/upload", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok || !data.message)
        throw new Error(data.error ?? "Görsel gönderilemedi.");
      window.localStorage.setItem(NAME_KEY, name.trim());
      setConversation(data.conversation);
      setMessages((current) => [...current, data.message!]);
      setMessage("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Görsel gönderilemedi.",
      );
    } finally {
      setSending(false);
    }
  }

  if (isAdminPage) return null;

  return (
    <div className="fixed bottom-4 right-4 z-dropdown sm:bottom-6 sm:right-6">
      {open ? (
        <section className="mb-3 flex h-[min(580px,calc(100dvh-100px))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <header className="flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
            <div>
              <h2 className="font-black">Canlı Destek</h2>
              <p
                className={`text-xs ${adminOnline ? "text-emerald-400" : "text-zinc-400"}`}
              >
                {adminOnline
                  ? "● Müşteri Temsilcisi Çevrimiçi"
                  : "○ Şu anda çevrimdışıyız. Mesajınızı bırakabilirsiniz."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10"
              aria-label="Sohbeti kapat"
            >
              <X className="size-4" />
            </button>
          </header>
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-4"
          >
            {messages.length ? (
              messages.map((item, index) => {
                const previous = messages[index - 1];
                const showDay =
                  !previous ||
                  new Date(previous.created_at).toDateString() !==
                    new Date(item.created_at).toDateString();
                return (
                  <div key={item.id}>
                    {showDay ? (
                      <div className="my-3 text-center text-[11px] font-bold text-zinc-400">
                        {dayLabel(item.created_at)}
                      </div>
                    ) : null}
                    <div
                      className={`mb-2 max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${item.sender === "customer" ? "ml-auto rounded-br-md bg-red-600 text-white" : "rounded-bl-md bg-white text-zinc-900"}`}
                    >
                      {item.attachment_url ? (
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Image
                            src={item.attachment_url}
                            alt={item.attachment_name ?? "Sohbet görseli"}
                            width={640}
                            height={480}
                            unoptimized
                            className="mb-2 max-h-52 w-full rounded-xl object-contain"
                          />
                        </a>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">
                        {item.body}
                      </p>
                      {item.sender === "ai" ? (
                        <p className="mt-1 text-[10px] font-bold text-zinc-500">
                          CENTER GSM AI tarafından oluşturuldu
                        </p>
                      ) : null}
                      <p
                        className={`mt-1 text-right text-[10px] ${item.sender === "customer" ? "text-red-100" : "text-zinc-400"}`}
                      >
                        {new Date(item.created_at).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {item.sender === "customer"
                          ? ` · ${item.read_at ? "✓✓ Okundu" : "✓ Gönderildi"}`
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-white p-3 text-sm text-zinc-600">
                Merhaba, mesajınızı bırakın. Ekibimiz buradan yanıtlayacaktır.
              </p>
            )}
            {adminTyping ? (
              <p className="text-xs font-semibold text-zinc-500">
                CENTER GSM yazıyor...
              </p>
            ) : null}
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
            {emojiOpen ? (
              <div className="flex gap-1 rounded-xl bg-zinc-100 p-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setMessage((value) => value + emoji)}
                    className="text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setEmojiOpen((value) => !value)}
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-zinc-200"
                aria-label="Emoji ekle"
              >
                <Smile className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-zinc-200"
                aria-label="Görsel gönder"
              >
                <ImagePlus className="size-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={upload}
                className="hidden"
              />
              <textarea
                value={message}
                onChange={(event) => publishTyping(event.target.value)}
                placeholder="Mesajınızı yazın…"
                maxLength={2000}
                rows={2}
                className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white disabled:opacity-50"
                aria-label="Mesajı gönder"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              JPG, PNG veya WebP · En fazla 5 MB
            </p>
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
        <MessageCircle className="size-5" /> Canlı Destek
      </button>
    </div>
  );
}
