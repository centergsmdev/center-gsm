"use client";

import { MessageCircle, Send, Smile, Trash2, X } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
  formatChatDateTime,
  formatChatDay,
  formatChatTime,
  turkeyDateKey,
} from "@/lib/format/date-time";
import type { LiveChatConversation, LiveChatMessage } from "@/types/database";

const EMOJIS = ["😊", "👍", "🙏", "❤️", "📦", "✅"];
type ChatMessage = LiveChatMessage & { attachment_url?: string | null };

export function AdminLiveChat({ aiConfigured }: { aiConfigured: boolean }) {
  const [conversations, setConversations] = useState<LiveChatConversation[]>(
    [],
  );
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [customerTyping, setCustomerTyping] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previousSelectedId = useRef<string | null>(null);
  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const loadAiSettings = useCallback(async () => {
    const client = createClient();
    if (!client) return;
    const result = await client
      .from("live_chat_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (result.data) setAiEnabled(result.data.ai_enabled);
  }, []);

  async function setGlobalAi(enabled: boolean) {
    const client = createClient();
    if (!client) return;
    const result = await client
      .from("live_chat_settings")
      .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (result.error) return setError("AI modu güncellenemedi.");
    setAiEnabled(enabled);
  }

  async function setConversationAi(enabled: boolean) {
    if (!selected) return;
    const client = createClient();
    if (!client) return;
    const result = await client
      .from("live_chat_conversations")
      .update({ ai_active: enabled })
      .eq("id", selected.id);
    if (result.error) return setError("Sohbet yönetimi güncellenemedi.");
    setConversations((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, ai_active: enabled } : item,
      ),
    );
  }

  const loadConversations = useCallback(async () => {
    const client = createClient();
    if (!client) return setError("Supabase bağlantısı bulunamadı.");
    const [conversationResult, unreadResult] = await Promise.all([
      client
        .from("live_chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false }),
      client
        .from("live_chat_messages")
        .select("conversation_id")
        .eq("sender", "customer")
        .is("read_at", null),
    ]);
    if (conversationResult.error || unreadResult.error)
      return setError("Sohbetler yüklenemedi.");
    const counts = unreadResult.data.reduce<Record<string, number>>(
      (current, item) => {
        current[item.conversation_id] =
          (current[item.conversation_id] ?? 0) + 1;
        return current;
      },
      {},
    );
    setUnread(counts);
    setConversations(
      [...conversationResult.data].sort((a, b) => {
        const unreadDifference =
          Number(Boolean(counts[b.id])) - Number(Boolean(counts[a.id]));
        return (
          unreadDifference ||
          new Date(b.last_message_at).getTime() -
            new Date(a.last_message_at).getTime()
        );
      }),
    );
    setSelectedId((current) =>
      current && conversationResult.data.some((item) => item.id === current)
        ? current
        : (conversationResult.data[0]?.id ?? null),
    );
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const client = createClient();
      if (!client) return;
      const result = await client
        .from("live_chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (result.error) return setError("Mesajlar yüklenemedi.");
      const withUrls = await Promise.all(
        result.data.map(async (message) => {
          if (!message.attachment_path) return message;
          const signed = await client.storage
            .from("live-chat-images")
            .createSignedUrl(message.attachment_path, 3600);
          return { ...message, attachment_url: signed.data?.signedUrl ?? null };
        }),
      );
      setMessages(withUrls);
      const read = await client
        .from("live_chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("sender", "customer")
        .is("read_at", null);
      if (!read.error) {
        setUnread((current) => ({ ...current, [conversationId]: 0 }));
        const conversation = conversations.find(
          (item) => item.id === conversationId,
        );
        if (conversation) {
          const channel = client.channel(
            `live-chat:${conversation.visitor_token}`,
          );
          await channel.httpSend("read", { role: "admin" });
          await client.removeChannel(channel);
        }
      }
    },
    [conversations],
  );

  useEffect(() => {
    void loadConversations();
    void loadAiSettings();
    const client = createClient();
    if (!client) return;
    const channel = client
      .channel("admin-live-chat-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_conversations" },
        () => void loadConversations(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_messages" },
        (payload) => {
          const incoming = payload.new as LiveChatMessage;
          if (incoming?.conversation_id === selectedId)
            void loadMessages(selectedId);
          void loadConversations();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_settings" },
        () => void loadAiSettings(),
      )
      .subscribe();
    return () => void client.removeChannel(channel);
  }, [loadAiSettings, loadConversations, loadMessages, selectedId]);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    const presence = client.channel("live-chat-support", {
      config: { presence: { key: "admin-support" } },
    });
    presence.subscribe(async (status) => {
      if (status === "SUBSCRIBED")
        await presence.track({
          role: "admin",
          online_at: new Date().toISOString(),
        });
    });
    return () => void client.removeChannel(presence);
  }, []);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      previousSelectedId.current = null;
      return;
    }
    if (previousSelectedId.current !== selected.id) {
      stickToBottom.current = true;
      previousSelectedId.current = selected.id;
    }
    void loadMessages(selected.id);
    const client = createClient();
    if (!client) return;
    const channel = client
      .channel(`live-chat:${selected.visitor_token}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.role === "customer")
          setCustomerTyping(Boolean(payload.typing));
      })
      .on("broadcast", { event: "read" }, () => void loadMessages(selected.id))
      .subscribe();
    return () => void client.removeChannel(channel);
  }, [loadMessages, selected]);

  useEffect(() => {
    const scroll = messageScrollRef.current;
    if (!scroll || !stickToBottom.current) return;
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
  }, [customerTyping, messages]);

  function updateMessageScrollPosition() {
    const scroll = messageScrollRef.current;
    if (!scroll) return;
    stickToBottom.current =
      scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 48;
  }

  function publishTyping(value: string) {
    setReply(value);
    if (!selected) return;
    const client = createClient();
    if (!client) return;
    const now = Date.now();
    if (now - lastTypingSent.current > 900) {
      lastTypingSent.current = now;
      void client
        .channel(`live-chat:${selected.visitor_token}`)
        .httpSend("typing", { role: "admin", typing: true });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () =>
        void client
          .channel(`live-chat:${selected.visitor_token}`)
          .httpSend("typing", { role: "admin", typing: false }),
      1400,
    );
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    const body = reply.trim();
    if (!selected || !body) return;
    const client = createClient();
    if (!client) return;
    setError("");
    const result = await client
      .from("live_chat_messages")
      .insert({ conversation_id: selected.id, sender: "admin", body })
      .select("*")
      .single();
    if (result.error) return setError("Yanıt gönderilemedi.");
    stickToBottom.current = true;
    setMessages((current) => [...current, result.data]);
    setReply("");
    const channel = client.channel(`live-chat:${selected.visitor_token}`);
    await channel.httpSend("message", result.data);
    await channel.httpSend("typing", { role: "admin", typing: false });
    await client.removeChannel(channel);
  }

  async function deleteConversation() {
    if (!selected || deletePending) return;
    setDeletePending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/live-chat/${selected.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Sohbet silinemedi.");
      setConversations((current) =>
        current.filter((item) => item.id !== selected.id),
      );
      setUnread((current) => {
        const next = { ...current };
        delete next[selected.id];
        return next;
      });
      setMessages([]);
      setSelectedId(null);
      setDeleteConfirmOpen(false);
      await loadConversations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sohbet silinemedi.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:h-[calc(100dvh-210px)] lg:max-h-[820px] lg:min-h-[560px] lg:grid-cols-[340px_1fr]">
      <aside className="max-h-72 border-b border-zinc-200 lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 p-4">
          <div>
            <h2 className="font-black">Sohbetler</h2>
            <p className="text-xs text-zinc-500">
              {conversations.length} görüşme
            </p>
          </div>
          <div className="text-right">
            <div
              className="flex rounded-full bg-zinc-100 p-1 text-[11px] font-black"
              aria-label="AI Modu"
            >
              <button
                type="button"
                onClick={() => void setGlobalAi(true)}
                disabled={!aiConfigured}
                className={`rounded-full px-2 py-1.5 ${aiEnabled ? "bg-emerald-600 text-white" : "text-zinc-500"}`}
              >
                ● Açık
              </button>
              <button
                type="button"
                onClick={() => void setGlobalAi(false)}
                disabled={!aiConfigured}
                className={`rounded-full px-2 py-1.5 ${!aiEnabled ? "bg-zinc-700 text-white" : "text-zinc-500"}`}
              >
                ● Kapalı
              </button>
            </div>
            {!aiConfigured ? (
              <p className="mt-1 text-[9px] font-bold text-amber-600">
                AI yapılandırması bekleniyor
              </p>
            ) : null}
          </div>
        </div>
        <div className="max-h-[220px] overflow-y-auto overscroll-contain p-2 lg:max-h-none lg:min-h-0 lg:flex-1">
          {conversations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`mb-1 flex w-full items-center justify-between rounded-xl p-3 text-left ${item.id === selectedId ? "bg-zinc-950 text-white" : "hover:bg-zinc-50"}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {item.customer_name}
                </span>
                <span className="mt-1 block text-xs opacity-60">
                  {formatChatDateTime(item.last_message_at)}
                </span>
              </span>
              {unread[item.id] ? (
                <span className="ml-2 grid size-6 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
                  {unread[item.id]}
                </span>
              ) : null}
            </button>
          ))}
          {!conversations.length ? (
            <p className="p-4 text-sm text-zinc-500">Henüz sohbet yok.</p>
          ) : null}
        </div>
      </aside>
      <section className="flex min-h-[500px] min-w-0 flex-col lg:min-h-0">
        {selected ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-zinc-200 p-4">
              <div>
                <h2 className="font-black">{selected.customer_name}</h2>
                <p className="text-xs text-emerald-600">
                  {aiEnabled && selected.ai_active
                    ? "AI destekli canlı görüşme"
                    : "Yalnızca müşteri temsilcisi"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="grid size-9 place-items-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50"
                  aria-label="Sohbeti sil"
                  title="Sohbeti sil"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void setConversationAi(!selected.ai_active)}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${selected.ai_active ? "bg-zinc-950 text-white" : "bg-violet-600 text-white"}`}
                >
                  {selected.ai_active ? "Sohbeti Devral" : "AI'ya Devret"}
                </button>
              </div>
            </header>
            <div
              ref={messageScrollRef}
              onScroll={updateMessageScrollPosition}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50 p-4"
            >
              {messages.map((item, index) => {
                const previous = messages[index - 1];
                const showDay =
                  !previous ||
                  turkeyDateKey(previous.created_at) !==
                    turkeyDateKey(item.created_at);
                return (
                  <div key={item.id}>
                    {showDay ? (
                      <div className="my-3 text-center text-[11px] font-bold text-zinc-400">
                        {formatChatDay(item.created_at)}
                      </div>
                    ) : null}
                    <div
                      className={`mb-2 max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%] ${item.sender === "admin" ? "ml-auto rounded-br-md bg-red-600 text-white" : item.sender === "ai" ? "ml-auto rounded-br-md bg-violet-600 text-white" : "rounded-bl-md bg-white text-zinc-900"}`}
                    >
                      {item.attachment_url ? (
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Image
                            src={item.attachment_url}
                            alt={item.attachment_name ?? "Müşteri görseli"}
                            width={800}
                            height={600}
                            unoptimized
                            className="mb-2 max-h-80 w-full rounded-xl object-contain"
                          />
                        </a>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">
                        {item.body}
                      </p>
                      {item.sender === "ai" ? (
                        <p className="mt-1 text-[10px] font-bold text-violet-100">
                          AI tarafından oluşturuldu
                        </p>
                      ) : item.sender === "admin" ? (
                        <p className="mt-1 text-[10px] font-bold text-red-100">
                          Admin yanıtı
                        </p>
                      ) : null}
                      <p
                        className={`mt-1 text-right text-[10px] ${item.sender === "admin" ? "text-red-100" : item.sender === "ai" ? "text-violet-100" : "text-zinc-400"}`}
                      >
                        {formatChatTime(item.created_at)}
                        {item.sender !== "customer"
                          ? ` · ${item.read_at ? "✓✓ Okundu" : "✓ Gönderildi"}`
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {customerTyping ? (
                <p className="text-xs font-semibold text-zinc-500">
                  Müşteri yazıyor...
                </p>
              ) : null}
            </div>
            <form onSubmit={sendReply} className="border-t border-zinc-200 p-3">
              {emojiOpen ? (
                <div className="mb-2 flex gap-1 rounded-xl bg-zinc-100 p-2">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setReply((value) => value + emoji)}
                      className="text-xl"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((value) => !value)}
                  className="grid size-12 shrink-0 place-items-center rounded-xl border border-zinc-200"
                  aria-label="Emoji ekle"
                >
                  <Smile className="size-4" />
                </button>
                <textarea
                  value={reply}
                  onChange={(event) => publishTyping(event.target.value)}
                  placeholder="Cevabınızı yazın…"
                  maxLength={2000}
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-red-500"
                />
                <button
                  disabled={!reply.trim()}
                  className="grid size-12 shrink-0 place-items-center self-end rounded-xl bg-red-600 text-white disabled:opacity-50"
                  aria-label="Yanıt gönder"
                >
                  <Send className="size-4" />
                </button>
              </div>
              {error ? (
                <p className="mt-2 text-xs text-red-600">{error}</p>
              ) : null}
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-center text-zinc-500">
            <div>
              <MessageCircle className="mx-auto mb-2 size-8" />
              <p>Görüntülemek için bir sohbet seçin.</p>
            </div>
          </div>
        )}
      </section>
      {deleteConfirmOpen && selected ? (
        <div
          className="fixed inset-0 z-modal grid place-items-center bg-zinc-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-chat-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-chat-title" className="text-lg font-black">
                  Sohbet kalıcı olarak silinsin mi?
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {selected.customer_name} ile yapılan görüşme, tüm mesajlar ve
                  gönderilen görseller hem admin hem müşteri ekranından
                  silinecek. Bu işlem geri alınamaz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletePending}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100"
                aria-label="Silme penceresini kapat"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletePending}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void deleteConversation()}
                disabled={deletePending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {deletePending ? "Siliniyor…" : "Sohbeti sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
