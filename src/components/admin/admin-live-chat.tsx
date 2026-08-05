"use client";

import { MessageCircle, Send } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { LiveChatConversation, LiveChatMessage } from "@/types/database";

export function AdminLiveChat() {
  const [conversations, setConversations] = useState<LiveChatConversation[]>(
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  async function loadConversations() {
    const client = createClient();
    if (!client) return setError("Supabase bağlantısı bulunamadı.");
    const result = await client
      .from("live_chat_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (result.error) return setError("Sohbetler yüklenemedi.");
    setConversations(result.data);
    setSelectedId((current) => current ?? result.data[0]?.id ?? null);
  }

  async function loadMessages(conversationId: string) {
    const client = createClient();
    if (!client) return;
    const result = await client
      .from("live_chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (result.error) return setError("Mesajlar yüklenemedi.");
    setMessages(result.data);
  }

  useEffect(() => {
    void loadConversations();
    const client = createClient();
    if (!client) return;
    const channel = client
      .channel("admin-live-chat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_conversations" },
        () => void loadConversations(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages" },
        (payload) => {
          const incoming = payload.new as LiveChatMessage;
          if (incoming.conversation_id === selectedId)
            setMessages((current) =>
              current.some((item) => item.id === incoming.id)
                ? current
                : [...current, incoming],
            );
          void loadConversations();
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

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
    setMessages((current) => [...current, result.data]);
    setReply("");
    const channel = client.channel(`live-chat:${selected.visitor_token}`);
    await channel.httpSend("message", result.data);
    await client.removeChannel(channel);
  }

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:grid-cols-[340px_1fr]">
      <aside className="border-b border-zinc-200 lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-200 p-4">
          <h2 className="font-black">Sohbetler</h2>
          <p className="text-xs text-zinc-500">
            {conversations.length} görüşme
          </p>
        </div>
        <div className="max-h-[560px] overflow-y-auto p-2">
          {conversations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`mb-1 w-full rounded-xl p-3 text-left ${
                item.id === selectedId
                  ? "bg-zinc-950 text-white"
                  : "hover:bg-zinc-50"
              }`}
            >
              <span className="block truncate text-sm font-bold">
                {item.customer_name}
              </span>
              <span className="mt-1 block text-xs opacity-60">
                {new Date(item.last_message_at).toLocaleString("tr-TR")}
              </span>
            </button>
          ))}
          {!conversations.length ? (
            <p className="p-4 text-sm text-zinc-500">Henüz sohbet yok.</p>
          ) : null}
        </div>
      </aside>
      <section className="flex min-h-[500px] min-w-0 flex-col">
        {selected ? (
          <>
            <header className="border-b border-zinc-200 p-4">
              <h2 className="font-black">{selected.customer_name}</h2>
              <p className="text-xs text-zinc-500">Canlı destek görüşmesi</p>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    item.sender === "admin"
                      ? "ml-auto bg-red-600 text-white"
                      : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {item.body}
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="border-t border-zinc-200 p-3">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Cevabınızı yazın…"
                  maxLength={2000}
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-red-500"
                />
                <button
                  className="grid size-12 place-items-center self-end rounded-xl bg-red-600 text-white"
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
    </div>
  );
}
