"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListRestart,
  LogOut,
  PencilLine,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { adminNavigation } from "@/data/admin/navigation";
import { useAdminAuth } from "@/providers/admin-auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_ACTIVITY_EVENT,
  ADMIN_ACTIVITY_STORAGE_KEY,
  adminActivityRoutes,
  emptyAdminActivityState,
  type AdminActivityKind,
  type AdminActivityState,
} from "@/lib/admin/activity-indicator";
import {
  ADMIN_NAVIGATION_ORDER_EVENT,
  adminNavigationStorageKey,
  moveAdminNavigationItem,
  moveAdminNavigationItemByOffset,
  normalizeAdminNavigationOrder,
} from "@/lib/admin/navigation-order";

const defaultNavigationOrder = adminNavigation.map((item) => item.href);
type AdminNavigationItem = (typeof adminNavigation)[number];

const activityKindByRoute = Object.fromEntries(
  Object.entries(adminActivityRoutes).map(([kind, route]) => [route, kind]),
) as Record<string, AdminActivityKind>;

function readActivityState(): AdminActivityState {
  try {
    const stored = window.localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY);
    if (!stored) return { ...emptyAdminActivityState };
    return { ...emptyAdminActivityState, ...JSON.parse(stored) };
  } catch {
    return { ...emptyAdminActivityState };
  }
}

function writeActivityState(state: AdminActivityState) {
  window.localStorage.setItem(
    ADMIN_ACTIVITY_STORAGE_KEY,
    JSON.stringify(state),
  );
}

export function AdminSidebar({
  mobile = false,
  open = false,
  onClose,
}: {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { logout, user } = useAdminAuth();
  const [unreadChats, setUnreadChats] = useState(0);
  const [activity, setActivity] = useState<AdminActivityState>(
    emptyAdminActivityState,
  );
  const [navigationOrder, setNavigationOrder] = useState<string[]>(
    defaultNavigationOrder,
  );
  const [editingNavigation, setEditingNavigation] = useState(false);
  const [draggedHref, setDraggedHref] = useState<string | null>(null);
  const [dropTargetHref, setDropTargetHref] = useState<string | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);
  const navigationStorageKey = adminNavigationStorageKey(user?.email);
  const orderedNavigation = useMemo(() => {
    const byHref = new Map<string, AdminNavigationItem>();
    adminNavigation.forEach((item) => byHref.set(item.href, item));
    return normalizeAdminNavigationOrder(
      navigationOrder,
      defaultNavigationOrder,
    ).flatMap((href) => {
      const item = byHref.get(href);
      return item ? [item] : [];
    });
  }, [navigationOrder]);

  useEffect(() => {
    const readOrder = () => {
      try {
        const stored = window.localStorage.getItem(navigationStorageKey);
        setNavigationOrder(
          normalizeAdminNavigationOrder(
            stored ? JSON.parse(stored) : null,
            defaultNavigationOrder,
          ),
        );
      } catch {
        setNavigationOrder([...defaultNavigationOrder]);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === navigationStorageKey) readOrder();
    };
    const handleOrderChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === navigationStorageKey) readOrder();
    };
    readOrder();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(ADMIN_NAVIGATION_ORDER_EVENT, handleOrderChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        ADMIN_NAVIGATION_ORDER_EVENT,
        handleOrderChange,
      );
    };
  }, [navigationStorageKey]);

  function persistNavigationOrder(order: string[]) {
    const normalized = normalizeAdminNavigationOrder(
      order,
      defaultNavigationOrder,
    );
    try {
      window.localStorage.setItem(
        navigationStorageKey,
        JSON.stringify(normalized),
      );
      window.dispatchEvent(
        new CustomEvent(ADMIN_NAVIGATION_ORDER_EVENT, {
          detail: { key: navigationStorageKey },
        }),
      );
    } catch {
      // The reordered menu remains available for the current session.
    }
    setNavigationOrder(normalized);
    setEditingNavigation(false);
    setOrderSaved(true);
    window.setTimeout(() => setOrderSaved(false), 2200);
  }

  function resetNavigationOrder() {
    persistNavigationOrder([...defaultNavigationOrder]);
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, href: string) {
    if (!editingNavigation) return;
    setDraggedHref(href);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", href);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetHref: string) {
    if (!editingNavigation) return;
    event.preventDefault();
    const sourceHref = draggedHref || event.dataTransfer.getData("text/plain");
    if (sourceHref)
      setNavigationOrder((current) =>
        moveAdminNavigationItem(current, sourceHref, targetHref),
      );
    setDraggedHref(null);
    setDropTargetHref(null);
  }

  useEffect(() => {
    setActivity(readActivityState());

    function handleActivity(event: Event) {
      const kind = (event as CustomEvent<{ kind?: AdminActivityKind }>).detail
        ?.kind;
      if (!kind || pathname.startsWith(adminActivityRoutes[kind])) return;

      setActivity((current) => {
        const next = { ...current, [kind]: true };
        writeActivityState(next);
        return next;
      });
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === ADMIN_ACTIVITY_STORAGE_KEY) {
        setActivity(readActivityState());
      }
    }

    window.addEventListener(ADMIN_ACTIVITY_EVENT, handleActivity);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(ADMIN_ACTIVITY_EVENT, handleActivity);
      window.removeEventListener("storage", handleStorage);
    };
  }, [pathname]);

  useEffect(() => {
    const currentKind = Object.entries(adminActivityRoutes).find(([, route]) =>
      pathname.startsWith(route),
    )?.[0] as AdminActivityKind | undefined;
    if (!currentKind) return;

    setActivity((current) => {
      if (!current[currentKind]) return current;
      const next = { ...current, [currentKind]: false };
      writeActivityState(next);
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    const loadUnread = async () => {
      const result = await client
        .from("live_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender", "customer")
        .is("read_at", null);
      if (!result.error) setUnreadChats(result.count ?? 0);
    };
    void loadUnread();
    const channel = client
      .channel(`admin-live-chat-badge:${mobile ? "mobile" : "desktop"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_messages" },
        () => void loadUnread(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [mobile]);
  const content = (
    <aside
      className={cn(
        "flex h-full flex-col bg-zinc-950 text-white",
        mobile ? "w-[290px]" : "w-[76px] lg:w-[260px]",
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5 lg:px-6">
        <Link
          href="/admin"
          prefetch={false}
          className="flex items-center gap-3"
          aria-label="CENTER GSM Admin ana sayfa"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-600 text-xs font-black shadow-lg shadow-red-950/30">
            CG
          </span>
          <span
            className={cn(
              "whitespace-nowrap text-sm font-black tracking-[.12em]",
              !mobile && "hidden lg:block",
            )}
          >
            CENTER GSM
          </span>
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label="Menüyü kapat"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "border-b border-white/10 px-3 py-3",
          !mobile && "hidden lg:block",
        )}
      >
        {editingNavigation ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => persistNavigationOrder(navigationOrder)}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-white font-bold text-zinc-950 transition hover:bg-zinc-100"
            >
              <Check className="size-4" /> Sırayı kaydet
            </button>
            <button
              type="button"
              onClick={resetNavigationOrder}
              className="grid size-9 place-items-center rounded-lg border border-white/15 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Varsayılan menü sırasına dön"
              title="Varsayılan sıraya dön"
            >
              <ListRestart className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOrderSaved(false);
              setEditingNavigation(true);
            }}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/15 text-xs font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <PencilLine className="size-4" /> Menüyü düzenle
          </button>
        )}
        {orderSaved ? (
          <p className="mt-2 text-center text-[11px] font-bold text-emerald-400">
            Menü sırası kaydedildi
          </p>
        ) : editingNavigation ? (
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Sürükleyin veya okları kullanın
          </p>
        ) : null}
      </div>
      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        aria-label="Admin menüsü"
      >
        {orderedNavigation.map((item, index) => {
          const active =
            item.href === "/admin" || ("exact" in item && item.exact)
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const activityKind = activityKindByRoute[item.href];
          const hasNewActivity = activityKind
            ? activity[activityKind] && !active
            : false;
          return (
            <div
              key={item.href}
              draggable={editingNavigation}
              onDragStart={(event) => handleDragStart(event, item.href)}
              onDragEnd={() => {
                setDraggedHref(null);
                setDropTargetHref(null);
              }}
              onDragOver={(event) => {
                if (!editingNavigation) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetHref(item.href);
              }}
              onDrop={(event) => handleDrop(event, item.href)}
              className={cn(
                "flex items-center gap-1 rounded-xl transition",
                editingNavigation && "cursor-grab active:cursor-grabbing",
                draggedHref === item.href && "opacity-40",
                dropTargetHref === item.href &&
                  draggedHref !== item.href &&
                  "ring-2 ring-inset ring-red-500/80",
              )}
            >
              <Link
                href={item.href}
                prefetch={false}
                onClick={(event) => {
                  if (editingNavigation) {
                    event.preventDefault();
                    return;
                  }
                  onClose?.();
                }}
                aria-current={active ? "page" : undefined}
                title={!mobile ? item.label : undefined}
                className={cn(
                  "group flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                  "child" in item && item.child && "ml-3 h-10 text-xs",
                  active
                    ? "bg-red-600 text-white shadow-lg shadow-red-950/20"
                    : hasNewActivity
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-950/25 hover:bg-emerald-500 hover:text-white"
                      : "text-zinc-400 hover:bg-white/[.07] hover:text-white",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    "min-w-0 truncate",
                    !mobile && "hidden lg:block",
                  )}
                >
                  {item.label}
                </span>
                {item.href === "/admin/canli-destek" && unreadChats > 0 ? (
                  <span
                    className={cn(
                      "ml-auto grid size-6 place-items-center rounded-full bg-white text-xs font-black text-red-600",
                      !mobile && "hidden lg:grid",
                    )}
                  >
                    {unreadChats > 99 ? "99+" : unreadChats}
                  </span>
                ) : null}
              </Link>
              {editingNavigation ? (
                <div
                  className={cn(
                    "items-center gap-0.5 pr-1",
                    mobile ? "flex" : "hidden lg:flex",
                  )}
                >
                  <GripVertical
                    className="size-4 text-zinc-500"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      setNavigationOrder((current) =>
                        moveAdminNavigationItemByOffset(current, item.href, -1),
                      )
                    }
                    className="grid size-7 place-items-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                    aria-label={`${item.label} seçeneğini yukarı taşı`}
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === orderedNavigation.length - 1}
                    onClick={() =>
                      setNavigationOrder((current) =>
                        moveAdminNavigationItemByOffset(current, item.href, 1),
                      )
                    }
                    className="grid size-7 place-items-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                    aria-label={`${item.label} seçeneğini aşağı taşı`}
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={logout}
          className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-400 transition hover:bg-white/[.07] hover:text-white"
        >
          <LogOut className="size-5 shrink-0" />
          <span className={cn(!mobile && "hidden lg:block")}>Çıkış yap</span>
        </button>
      </div>
    </aside>
  );
  if (!mobile) return content;
  return (
    <div
      className={cn(
        "fixed inset-0 z-modal transition md:hidden",
        open ? "visible" : "invisible",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Menüyü kapat"
        className={cn(
          "absolute inset-0 bg-zinc-950/45 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative h-full w-fit transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {content}
      </div>
    </div>
  );
}
