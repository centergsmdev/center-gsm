"use client";

import {
  Bell,
  Check,
  FileCheck2,
  MessageCircle,
  PackageCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_ACTIVITY_EVENT,
  type AdminActivityKind,
} from "@/lib/admin/activity-indicator";

type NotificationKind = "order" | "receipt" | "message";

type AdminNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
};

const kindIcon = {
  order: PackageCheck,
  receipt: FileCheck2,
  message: MessageCircle,
};

function notificationBody(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
}

export function AdminRealtimeNotifications() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [toasts, setToasts] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  useEffect(() => {
    setPermission(
      "Notification" in window ? Notification.permission : "unsupported",
    );
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const client = createClient();
    if (!client) return;

    function announce(item: AdminNotification) {
      window.dispatchEvent(
        new CustomEvent<{ kind: AdminActivityKind }>(ADMIN_ACTIVITY_EVENT, {
          detail: { kind: item.kind },
        }),
      );
      setItems((current) => [item, ...current].slice(0, 30));
      setToasts((current) => [item, ...current].slice(0, 3));
      setUnread((current) => current + 1);

      window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== item.id));
      }, 7000);

      if ("Notification" in window && Notification.permission === "granted") {
        const browserNotification = new Notification(item.title, {
          body: item.body,
          icon: "/favicon.ico",
          tag: item.id,
        });
        browserNotification.onclick = () => {
          window.focus();
          window.location.assign(item.href);
          browserNotification.close();
        };
      }
    }

    const channel = client
      .channel("admin-global-realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as Record<string, unknown>;
          const orderNumber = notificationBody(
            order.order_number,
            "Yeni sipariş",
          );
          announce({
            id: `order:${String(order.id)}:${Date.now()}`,
            kind: "order",
            title: "Yeni sipariş geldi",
            body: `${orderNumber} numaralı sipariş yönetim paneline düştü.`,
            href: `/admin/siparisler/${String(order.id)}`,
            createdAt: new Date(),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payment_receipts" },
        (payload) => {
          const receipt = payload.new as Record<string, unknown>;
          if (receipt.status !== "pending_review" || !receipt.uploaded_at)
            return;
          announce({
            id: `receipt:${String(receipt.id)}:${String(receipt.updated_at)}`,
            kind: "receipt",
            title: "Yeni dekont yüklendi",
            body: "Havale / EFT dekontu incelemenizi bekliyor.",
            href: "/admin/dekontlar",
            createdAt: new Date(),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages" },
        (payload) => {
          const message = payload.new as Record<string, unknown>;
          if (message.sender !== "customer") return;
          announce({
            id: `message:${String(message.id)}`,
            kind: "message",
            title: "Yeni canlı destek mesajı",
            body: notificationBody(
              message.body,
              "Müşteri bir görsel gönderdi.",
            ),
            href: "/admin/canli-destek",
            createdAt: new Date(),
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) return setPermission("unsupported");
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  function visit(item: AdminNotification) {
    setOpen(false);
    setToasts((current) => current.filter((entry) => entry.id !== item.id));
    router.push(item.href);
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setUnread(0);
          }}
          className="relative grid size-10 place-items-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          aria-label={unread ? `${unread} yeni bildirim` : "Bildirimler"}
          aria-expanded={open}
        >
          <Bell className="size-4" />
          {unread ? (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-5 text-white ring-2 ring-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 top-12 z-dropdown w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <div>
                <p className="font-black text-zinc-950">Anlık bildirimler</p>
                <p className="text-xs text-zinc-500">
                  Sipariş, dekont ve mesajlar
                </p>
              </div>
              {permission === "granted" ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <Check className="size-3.5" /> Tarayıcı açık
                </span>
              ) : null}
            </div>

            {permission === "default" ? (
              <div className="border-b border-zinc-100 bg-red-50 p-3">
                <button
                  type="button"
                  onClick={() => void enableBrowserNotifications()}
                  className="w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white hover:bg-red-700"
                >
                  Cihaz bildirimlerini aç
                </button>
                <p className="mt-2 text-xs text-red-700">
                  Panel arka plandayken de yeni hareketleri anında görün.
                </p>
              </div>
            ) : null}

            {permission === "denied" ? (
              <p className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Cihaz bildirimleri tarayıcıda engellenmiş. Adres çubuğundaki
                site ayarlarından bildirim iznini açabilirsiniz.
              </p>
            ) : null}

            <div className="max-h-96 overflow-y-auto overscroll-contain">
              {items.length ? (
                items.map((item) => {
                  const Icon = kindIcon[item.kind];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => visit(item)}
                      className="flex w-full gap-3 border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-zinc-50"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-zinc-950">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-zinc-600">
                          {item.body}
                        </span>
                        <span className="mt-1 block text-[11px] text-zinc-400">
                          {item.createdAt.toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Bell className="mx-auto size-7 text-zinc-300" />
                  <p className="mt-3 text-sm font-bold text-zinc-700">
                    Henüz yeni bildirim yok
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Yeni hareketler burada anında görünecek.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((item) => {
          const Icon = kindIcon[item.kind];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => visit(item)}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left text-white shadow-2xl"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-600">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-300">
                  {item.body}
                </span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setToasts((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setToasts((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    );
                  }
                }}
                aria-label="Bildirimi kapat"
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
