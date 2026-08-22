"use client";

import { Bell, ImagePlus, MessageCircle, Send, Smile, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { ChatMessageText } from "@/components/live-chat/chat-message-text";
import { CustomerVideoCall } from "@/components/live-chat/customer-video-call";
import {
  formatChatDay,
  formatChatTime,
  turkeyDateKey,
} from "@/lib/format/date-time";
import type { LiveChatConversation, LiveChatMessage } from "@/types/database";
import {
  createCoarseDeviceProfile,
  encodeCoarseDeviceProfile,
  LIVE_CHAT_ABUSE_TOKEN_KEY,
  LIVE_CHAT_BLOCKED_MESSAGE,
  LIVE_CHAT_DEVICE_PROFILE_HEADER,
  LIVE_CHAT_VISITOR_COOKIE_KEY,
} from "@/lib/live-chat/abuse-shared";

const TOKEN_KEY = "center-gsm-live-chat-token";
const NAME_KEY = "center-gsm-live-chat-name";
const EMOJIS = ["😊", "👍", "🙏", "❤️", "📦", "✅"];

type ChatMessage = LiveChatMessage & { attachment_url?: string | null };

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);

  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

type ChatResponse = {
  conversation: LiveChatConversation | null;
  messages?: ChatMessage[];
  message?: ChatMessage;
  error?: string;
  code?: string;
};

function setFirstPartyCookie(key: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LiveChatWidget() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<{
    height: number;
    offsetTop: number;
  } | null>(null);
  const [hasUnreadAdminReply, setHasUnreadAdminReply] = useState(false);
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<LiveChatConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [deviceProfileHeader, setDeviceProfileHeader] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [notificationPending, setNotificationPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const chatChannelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof createClient>>["channel"]
  > | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const stickToBottom = useRef(true);

  const sendCustomerTyping = useCallback(
    (typing: boolean) => {
      if (accessBlocked) return;
      void chatChannelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { role: "customer", typing },
      });
    },
    [accessBlocked],
  );

  const stopCustomerTyping = useCallback(() => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
    lastTypingSent.current = 0;
    sendCustomerTyping(false);
  }, [sendCustomerTyping]);

  const subscribeToNotifications = useCallback(async () => {
    const conversationId = conversation?.id;
    if (
      !conversationId ||
      !token ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    )
      return;
    setNotificationPending(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") return;
      const keyResponse = await fetch("/api/live-chat/push-subscription", {
        cache: "no-store",
      });
      const keyData = (await keyResponse.json()) as {
        publicKey?: string;
        error?: string;
      };
      if (!keyResponse.ok || !keyData.publicKey)
        throw new Error(keyData.error ?? "Bildirim servisi kullanılamıyor.");
      const registration = await navigator.serviceWorker.register(
        "/live-chat-push-sw.js",
        { scope: "/" },
      );
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        }));
      const json = subscription.toJSON();
      const response = await fetch("/api/live-chat/push-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          conversationId,
          subscription: { endpoint: subscription.endpoint, keys: json.keys },
        }),
      });
      if (!response.ok) throw new Error("Bildirim aboneliği kaydedilemedi.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Bildirimler etkinleştirilemedi.",
      );
    } finally {
      setNotificationPending(false);
    }
  }, [conversation?.id, token]);

  const loadChat = useCallback(async () => {
    if (!token) return;
    const response = await fetch(
      `/api/live-chat?token=${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        headers: deviceProfileHeader
          ? { [LIVE_CHAT_DEVICE_PROFILE_HEADER]: deviceProfileHeader }
          : undefined,
      },
    );
    const data = (await response.json()) as ChatResponse;
    if (data.code === "LIVE_CHAT_BLOCKED") {
      setAccessBlocked(true);
      setConversation(null);
      setMessages([]);
      setError("");
      return;
    }
    if (!response.ok)
      throw new Error(data.error ?? "Sohbet geçmişi yüklenemedi.");
    setAccessBlocked(false);
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
  }, [deviceProfileHeader, open, token]);

  useEffect(() => {
    if (isAdminPage) return;
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      setFirstPartyCookie(LIVE_CHAT_VISITOR_COOKIE_KEY, storedToken);
    }
    const abuseToken = window.localStorage.getItem(LIVE_CHAT_ABUSE_TOKEN_KEY);
    if (abuseToken) setFirstPartyCookie(LIVE_CHAT_ABUSE_TOKEN_KEY, abuseToken);
    setDeviceProfileHeader(
      encodeCoarseDeviceProfile(createCoarseDeviceProfile()),
    );
    setName(window.localStorage.getItem(NAME_KEY) ?? "");
  }, [isAdminPage]);

  useEffect(() => {
    if (isAdminPage || !open) return;
    let abuseToken = window.localStorage.getItem(LIVE_CHAT_ABUSE_TOKEN_KEY);
    if (!abuseToken) {
      abuseToken = crypto.randomUUID();
      window.localStorage.setItem(LIVE_CHAT_ABUSE_TOKEN_KEY, abuseToken);
    }
    setFirstPartyCookie(LIVE_CHAT_ABUSE_TOKEN_KEY, abuseToken);
  }, [isAdminPage, open]);

  useEffect(() => {
    if (isAdminPage || !open || token) return;
    const nextToken = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    setFirstPartyCookie(LIVE_CHAT_VISITOR_COOKIE_KEY, nextToken);
    setToken(nextToken);
  }, [isAdminPage, open, token]);

  useEffect(() => {
    if (open) setHasUnreadAdminReply(false);
  }, [open]);

  useEffect(() => {
    if (isAdminPage || typeof window === "undefined") return;
    if ("Notification" in window)
      setNotificationPermission(Notification.permission);
    else setNotificationPermission("unsupported");
    if (new URLSearchParams(window.location.search).get("liveChat") === "1")
      setOpen(true);
  }, [isAdminPage]);

  useEffect(() => {
    if (
      isAdminPage ||
      !conversation?.id ||
      notificationPermission !== "granted"
    )
      return;
    void subscribeToNotifications();
  }, [
    conversation?.id,
    isAdminPage,
    notificationPermission,
    subscribeToNotifications,
  ]);

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
    if (
      isAdminPage ||
      !open ||
      !window.matchMedia("(max-width: 639px)").matches
    )
      return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isAdminPage, open]);

  useEffect(() => {
    if (isAdminPage || !open) return;

    const media = window.matchMedia("(max-width: 639px)");
    let frame = 0;

    const updateViewport = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!media.matches) {
          setMobileViewport(null);
          return;
        }

        const viewport = window.visualViewport;
        setMobileViewport({
          height: Math.max(
            320,
            Math.round(viewport?.height ?? window.innerHeight),
          ),
          offsetTop: Math.max(0, Math.round(viewport?.offsetTop ?? 0)),
        });
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    media.addEventListener?.("change", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      media.removeEventListener?.("change", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [isAdminPage, open]);

  useEffect(() => {
    if (isAdminPage) return;
    const client = createClient();
    if (!client || !token) return;
    const channel = client
      .channel(`live-chat:${token}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const incomingMessage = payload as Partial<ChatMessage> | undefined;
        if (!open && incomingMessage?.sender === "admin") {
          setHasUnreadAdminReply(true);
        }
        if (open) void loadChat();
      })
      .on("broadcast", { event: "read" }, () => {
        if (open) void loadChat();
      })
      .on("broadcast", { event: "conversation_deleted" }, ({ payload }) => {
        if (
          conversation?.id &&
          payload?.conversationId &&
          payload.conversationId !== conversation.id
        )
          return;
        setConversation(null);
        setMessages([]);
        setMessage("");
        setError("");
        setHasUnreadAdminReply(false);
        stickToBottom.current = true;
      })
      .on("broadcast", { event: "access_blocked" }, () => {
        stopCustomerTyping();
        setAccessBlocked(true);
        setConversation(null);
        setMessages([]);
        setMessage("");
        setError("");
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!open) return;
        if (payload?.role !== "admin" && payload?.role !== "ai") return;
        setAdminTyping(Boolean(payload.typing));
      })
      .subscribe();
    chatChannelRef.current = channel;
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { role: "customer", typing: false },
      });
      chatChannelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [
    conversation?.id,
    isAdminPage,
    loadChat,
    open,
    stopCustomerTyping,
    token,
  ]);

  useEffect(() => {
    if (isAdminPage || !open) return;
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
  }, [isAdminPage, open, token]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const dialog = dialogRef.current;
    if (!dialog) return;
    const activeDialog = dialog;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        stopCustomerTyping();
        setOpen(false);
        window.requestAnimationFrame(() => launcherRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        activeDialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    activeDialog.addEventListener("keydown", handleKeyDown);
    return () => activeDialog.removeEventListener("keydown", handleKeyDown);
  }, [open, stopCustomerTyping]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || !stickToBottom.current) return;
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
  }, [adminTyping, messages]);

  function updateScrollPosition() {
    const scroll = scrollRef.current;
    if (!scroll) return;
    stickToBottom.current =
      scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 48;
  }

  function toggleChat() {
    if (open) stopCustomerTyping();
    else stickToBottom.current = true;
    setOpen(!open);
  }

  function publishTyping(value: string) {
    setMessage(value);
    if (!value.trim()) {
      stopCustomerTyping();
      return;
    }
    const now = Date.now();
    if (now - lastTypingSent.current > 900) {
      lastTypingSent.current = now;
      sendCustomerTyping(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
      lastTypingSent.current = 0;
      sendCustomerTyping(false);
    }, 1400);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanMessage = message.trim();
    if (!token || cleanName.length < 2 || !cleanMessage) return;
    stopCustomerTyping();
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/live-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(deviceProfileHeader
            ? { [LIVE_CHAT_DEVICE_PROFILE_HEADER]: deviceProfileHeader }
            : {}),
        },
        body: JSON.stringify({ token, name: cleanName, message: cleanMessage }),
      });
      const data = (await response.json()) as ChatResponse;
      if (data.code === "LIVE_CHAT_BLOCKED") {
        setAccessBlocked(true);
        setConversation(null);
        setMessages([]);
        throw new Error(LIVE_CHAT_BLOCKED_MESSAGE);
      }
      if (!response.ok || !data.message)
        throw new Error(data.error ?? "Mesaj gönderilemedi.");
      window.localStorage.setItem(NAME_KEY, cleanName);
      setConversation(data.conversation);
      stickToBottom.current = true;
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
        headers: deviceProfileHeader
          ? { [LIVE_CHAT_DEVICE_PROFILE_HEADER]: deviceProfileHeader }
          : undefined,
        body: form,
      });
      const data = (await response.json()) as ChatResponse;
      if (data.code === "LIVE_CHAT_BLOCKED") {
        setAccessBlocked(true);
        setConversation(null);
        setMessages([]);
        throw new Error(LIVE_CHAT_BLOCKED_MESSAGE);
      }
      if (!response.ok || !data.message)
        throw new Error(data.error ?? "Görsel gönderilemedi.");
      window.localStorage.setItem(NAME_KEY, name.trim());
      setConversation(data.conversation);
      stickToBottom.current = true;
      setMessages((current) => [...current, data.message!]);
      setMessage("");
      void fetch("/api/live-chat/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, messageId: data.message.id }),
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Görsel gönderilemedi.",
      );
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  const mobileDialogViewportStyle: CSSProperties | undefined =
    open && mobileViewport
      ? {
          top: `${mobileViewport.offsetTop}px`,
          bottom: "auto",
          height: `${mobileViewport.height}px`,
        }
      : undefined;

  if (isAdminPage || !mounted) return null;

  return createPortal(
    <div
      style={mobileDialogViewportStyle}
      className={`fixed z-[1000] ${
        open
          ? "inset-x-0 top-0 flex h-[100dvh] sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:block sm:h-auto"
          : "bottom-4 right-4 sm:bottom-6 sm:right-6"
      }`}
    >
      {open ? (
        <section
          id="live-chat-dialog"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-chat-title"
          className="flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden border-0 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:mb-3 sm:h-[min(580px,calc(100dvh-48px))] sm:w-[min(380px,calc(100vw-24px))] sm:rounded-3xl sm:border sm:border-zinc-200"
        >
          <header className="flex shrink-0 items-center justify-between bg-zinc-950 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:py-3">
            <div>
              <h2 id="live-chat-title" className="font-black">
                Canlı Destek
              </h2>
              <p
                className={`text-xs ${adminOnline ? "text-emerald-400" : "text-zinc-400"}`}
              >
                {adminOnline
                  ? "● Müşteri Temsilcisi Çevrimiçi"
                  : "○ Şu anda çevrimdışıyız. Mesajınızı bırakabilirsiniz."}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                stopCustomerTyping();
                setOpen(false);
                window.requestAnimationFrame(() =>
                  launcherRef.current?.focus(),
                );
              }}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10"
              aria-label="Sohbeti kapat"
            >
              <X className="size-4" />
            </button>
          </header>
          <div
            ref={scrollRef}
            onScroll={updateScrollPosition}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50 p-4"
          >
            {accessBlocked ? (
              <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-center text-sm font-semibold text-zinc-700">
                {LIVE_CHAT_BLOCKED_MESSAGE}
              </p>
            ) : messages.length ? (
              messages.map((item, index) => {
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
                      <ChatMessageText
                        body={item.body}
                        inverted={item.sender === "customer"}
                      />
                      {item.sender === "ai" ? (
                        <p className="mt-1 text-[10px] font-bold text-zinc-500">
                          CENTER GSM AI tarafından oluşturuldu
                        </p>
                      ) : null}
                      <p
                        className={`mt-1 text-right text-[10px] ${item.sender === "customer" ? "text-red-100" : "text-zinc-400"}`}
                      >
                        {formatChatTime(item.created_at)}
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
            className={`${accessBlocked ? "hidden" : ""} shrink-0 space-y-2 border-t border-zinc-200 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:p-3`}
          >
            {conversation && token ? (
              <CustomerVideoCall
                token={token}
                conversationId={conversation.id}
              />
            ) : null}
            {conversation && notificationPermission === "default" ? (
              <button
                type="button"
                onClick={() => void subscribeToNotifications()}
                disabled={notificationPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-800 disabled:opacity-50"
              >
                <Bell className="size-4" />
                {notificationPending
                  ? "Bildirimler açılıyor…"
                  : "Yeni yanıt bildirimlerini aç"}
              </button>
            ) : null}
            {!conversation ? (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Adınız"
                maxLength={80}
                required
                className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-base outline-none focus:border-red-500 sm:text-sm"
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
                onBlur={stopCustomerTyping}
                onKeyDown={(event) => {
                  if (
                    event.key !== "Enter" ||
                    event.shiftKey ||
                    event.nativeEvent.isComposing
                  )
                    return;
                  event.preventDefault();
                  if (!sending && message.trim())
                    event.currentTarget.form?.requestSubmit();
                }}
                placeholder="Mesajınızı yazın…"
                maxLength={2000}
                rows={2}
                className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-red-500 sm:text-sm"
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
          {accessBlocked ? (
            <div className="shrink-0 border-t border-zinc-200 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center text-xs text-zinc-500 sm:p-4">
              Bu kanaldan yeni mesaj veya görüşme talebi gönderilemez.
            </div>
          ) : null}
        </section>
      ) : null}
      <button
        ref={launcherRef}
        type="button"
        onClick={toggleChat}
        className={`relative ml-auto h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-white shadow-xl transition ${
          open ? "hidden sm:flex" : "flex"
        } ${
          hasUnreadAdminReply
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-zinc-950 hover:bg-red-600"
        }`}
        aria-label={open ? "Canlı desteği kapat" : "Canlı desteği aç"}
        aria-expanded={open}
        aria-controls="live-chat-dialog"
      >
        {hasUnreadAdminReply ? (
          <span className="absolute -right-1 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-white px-1 text-xs font-black text-emerald-700 shadow-lg">
            1
          </span>
        ) : null}
        <MessageCircle className="size-5" /> Canlı Destek
      </button>
    </div>,
    document.body,
  );
}
