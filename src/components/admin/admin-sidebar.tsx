"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  LayoutTemplate,
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
  ADMIN_ACTIVITY_STATE_EVENT,
  ADMIN_ACTIVITY_STORAGE_KEY,
  adminActivityRoutes,
  createAdminActivityBaseline,
  emptyAdminActivityState,
  type AdminActivityKind,
  type AdminActivitySeenAt,
  type AdminActivityState,
} from "@/lib/admin/activity-indicator";
import {
  ADMIN_NAVIGATION_ORDER_EVENT,
  adminNavigationPresetStorageKey,
  adminNavigationStorageKey,
  moveAdminNavigationItem,
  moveAdminNavigationItemByOffset,
  normalizeAdminNavigationOrder,
} from "@/lib/admin/navigation-order";

const defaultNavigationOrder = adminNavigation.map((item) => item.href);
type AdminNavigationItem = (typeof adminNavigation)[number];
type SupabaseBrowserClient = NonNullable<ReturnType<typeof createClient>>;

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
  window.dispatchEvent(
    new CustomEvent<AdminActivityState>(ADMIN_ACTIVITY_STATE_EVENT, {
      detail: state,
    }),
  );
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readMenuPreset(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return readStringArray((value as { layout1?: unknown }).layout1);
}

function readActivitySeenAt(value: unknown): AdminActivitySeenAt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([kind, timestamp]) =>
        kind in emptyAdminActivityState && typeof timestamp === "string",
    ),
  ) as AdminActivitySeenAt;
}

async function countSince(
  query: PromiseLike<{ count: number | null; error: unknown }>,
) {
  const result = await query;
  return result.error ? null : (result.count ?? 0);
}

async function loadActivityCounts(
  client: SupabaseBrowserClient,
  seenAt: AdminActivitySeenAt,
) {
  const baseline = createAdminActivityBaseline();
  const since = (kind: AdminActivityKind) => seenAt[kind] ?? baseline[kind];
  const [
    order,
    bankReceipt,
    installmentReceipt,
    message,
    installment,
    tradeIn,
    customer,
  ] = await Promise.all([
    countSince(
      client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gt("created_at", since("order")),
    ),
    countSince(
      client
        .from("payment_receipts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review")
        .gt("uploaded_at", since("receipt")),
    ),
    countSince(
      client
        .from("installment_payment_receipts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review")
        .gt("uploaded_at", since("receipt")),
    ),
    countSince(
      client
        .from("live_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender", "customer")
        .gt("created_at", since("message")),
    ),
    countSince(
      client
        .from("installment_applications")
        .select("id", { count: "exact", head: true })
        .in("status", ["submitted", "under_review"])
        .gt("submitted_at", since("installment")),
    ),
    countSince(
      client
        .from("trade_in_applications")
        .select("id", { count: "exact", head: true })
        .gt("created_at", since("tradeIn")),
    ),
    countSince(
      client
        .from("customer_profiles")
        .select("id", { count: "exact", head: true })
        .gt("created_at", since("customer")),
    ),
  ]);

  return {
    activity: {
      order: order === null ? null : order > 0,
      receipt:
        bankReceipt === null && installmentReceipt === null
          ? null
          : (bankReceipt ?? 0) + (installmentReceipt ?? 0) > 0,
      message: message === null ? null : message > 0,
      installment: installment === null ? null : installment > 0,
      tradeIn: tradeIn === null ? null : tradeIn > 0,
      customer: customer === null ? null : customer > 0,
    },
    messageCount: message,
  };
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
  const [menuPresetOrder, setMenuPresetOrder] = useState<string[] | null>(null);
  const [activitySeenAt, setActivitySeenAt] = useState<AdminActivitySeenAt>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [editingNavigation, setEditingNavigation] = useState(false);
  const [draggedHref, setDraggedHref] = useState<string | null>(null);
  const [dropTargetHref, setDropTargetHref] = useState<string | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);
  const navigationStorageKey = adminNavigationStorageKey(user?.email);
  const presetStorageKey = adminNavigationPresetStorageKey(user?.email);
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
        const storedPreset = window.localStorage.getItem(presetStorageKey);
        setMenuPresetOrder(
          normalizeAdminNavigationOrder(
            storedPreset ? JSON.parse(storedPreset) : null,
            defaultNavigationOrder,
          ),
        );
      } catch {
        setNavigationOrder([...defaultNavigationOrder]);
        setMenuPresetOrder([...defaultNavigationOrder]);
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
  }, [navigationStorageKey, presetStorageKey]);

  useEffect(() => {
    if (!user?.id) {
      setPreferencesLoaded(false);
      return;
    }
    const client = createClient();
    if (!client) {
      setPreferencesLoaded(true);
      return;
    }
    const userId = user.id;
    const supabase = client;
    let cancelled = false;

    async function loadPreferences() {
      const result = await supabase
        .from("admin_ui_preferences")
        .select("menu_order,menu_presets,activity_seen_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;

      const storedOrder = (() => {
        try {
          return JSON.parse(
            window.localStorage.getItem(navigationStorageKey) ?? "[]",
          );
        } catch {
          return [];
        }
      })();
      const localOrder = normalizeAdminNavigationOrder(
        storedOrder,
        defaultNavigationOrder,
      );
      const remoteOrder = readStringArray(result.data?.menu_order);
      const nextOrder = normalizeAdminNavigationOrder(
        remoteOrder.length ? remoteOrder : localOrder,
        defaultNavigationOrder,
      );
      const remotePreset = readMenuPreset(result.data?.menu_presets);
      const nextPreset = normalizeAdminNavigationOrder(
        remotePreset.length ? remotePreset : nextOrder,
        defaultNavigationOrder,
      );
      const remoteSeenAt = readActivitySeenAt(result.data?.activity_seen_at);
      const nextSeenAt = Object.keys(remoteSeenAt).length
        ? remoteSeenAt
        : createAdminActivityBaseline();

      setNavigationOrder(nextOrder);
      setMenuPresetOrder(nextPreset);
      setActivitySeenAt(nextSeenAt);
      setPreferencesLoaded(true);
      window.localStorage.setItem(
        navigationStorageKey,
        JSON.stringify(nextOrder),
      );
      window.localStorage.setItem(presetStorageKey, JSON.stringify(nextPreset));

      if (!result.data || !remoteOrder.length || !remotePreset.length) {
        await supabase.from("admin_ui_preferences").upsert(
          {
            user_id: userId,
            menu_order: nextOrder,
            menu_presets: { layout1: nextPreset },
            activity_seen_at: nextSeenAt,
          },
          { onConflict: "user_id" },
        );
      }
    }

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [navigationStorageKey, presetStorageKey, user?.id]);

  function persistNavigationOrder(order: string[], saveAsPreset = true) {
    const normalized = normalizeAdminNavigationOrder(
      order,
      defaultNavigationOrder,
    );
    try {
      window.localStorage.setItem(
        navigationStorageKey,
        JSON.stringify(normalized),
      );
      if (saveAsPreset) {
        window.localStorage.setItem(
          presetStorageKey,
          JSON.stringify(normalized),
        );
      }
      window.dispatchEvent(
        new CustomEvent(ADMIN_NAVIGATION_ORDER_EVENT, {
          detail: { key: navigationStorageKey },
        }),
      );
    } catch {
      // The reordered menu remains available for the current session.
    }
    setNavigationOrder(normalized);
    if (saveAsPreset) setMenuPresetOrder(normalized);
    const client = createClient();
    if (client && user?.id) {
      void client.from("admin_ui_preferences").upsert(
        {
          user_id: user.id,
          menu_order: normalized,
          menu_presets: {
            layout1: saveAsPreset
              ? normalized
              : (menuPresetOrder ?? normalized),
          },
        },
        { onConflict: "user_id" },
      );
    }
    setEditingNavigation(false);
    setOrderSaved(true);
    window.setTimeout(() => setOrderSaved(false), 2200);
  }

  function resetNavigationOrder() {
    setNavigationOrder([...defaultNavigationOrder]);
  }

  function applyMenuPreset() {
    persistNavigationOrder(
      menuPresetOrder ?? [...defaultNavigationOrder],
      false,
    );
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

      if (kind === "message") {
        setUnreadChats((current) => current + 1);
      }

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

    function handleStateChange(event: Event) {
      if (!mobile) return;
      const next = (event as CustomEvent<AdminActivityState>).detail;
      if (next) setActivity({ ...emptyAdminActivityState, ...next });
    }

    window.addEventListener(ADMIN_ACTIVITY_EVENT, handleActivity);
    window.addEventListener(ADMIN_ACTIVITY_STATE_EVENT, handleStateChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(ADMIN_ACTIVITY_EVENT, handleActivity);
      window.removeEventListener(
        ADMIN_ACTIVITY_STATE_EVENT,
        handleStateChange,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [mobile, pathname]);

  useEffect(() => {
    if (mobile || !preferencesLoaded || !user?.id) return;
    const currentKind = Object.entries(adminActivityRoutes).find(([, route]) =>
      pathname.startsWith(route),
    )?.[0] as AdminActivityKind | undefined;
    if (!currentKind) return;

    const timestamp = new Date().toISOString();
    setActivitySeenAt((current) => {
      const next = { ...current, [currentKind]: timestamp };
      const client = createClient();
      if (client) {
        void client
          .from("admin_ui_preferences")
          .update({ activity_seen_at: next })
          .eq("user_id", user.id);
      }
      return next;
    });
    if (currentKind === "message") setUnreadChats(0);

    setActivity((current) => {
      const next = { ...current, [currentKind]: false };
      writeActivityState(next);
      return next;
    });
  }, [mobile, pathname, preferencesLoaded, user?.id]);

  useEffect(() => {
    if (mobile || !preferencesLoaded || !user?.id) return;
    const client = createClient();
    if (!client) return;
    let cancelled = false;

    const refreshActivity = async () => {
      const snapshot = await loadActivityCounts(client, activitySeenAt);
      if (cancelled) return;
      setActivity((current) => {
        const next = { ...current };
        for (const kind of Object.keys(
          emptyAdminActivityState,
        ) as AdminActivityKind[]) {
          const value = snapshot.activity[kind];
          if (
            value !== null &&
            !pathname.startsWith(adminActivityRoutes[kind])
          ) {
            next[kind] = value;
          }
        }
        writeActivityState(next);
        return next;
      });
      if (
        snapshot.messageCount !== null &&
        !pathname.startsWith(adminActivityRoutes.message)
      ) {
        setUnreadChats(snapshot.messageCount);
      }
    };

    void refreshActivity();
    const interval = window.setInterval(() => void refreshActivity(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activitySeenAt, mobile, pathname, preferencesLoaded, user?.id]);
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
              <Check className="size-4" /> 1. düzeni kaydet
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOrderSaved(false);
                setEditingNavigation(true);
              }}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-2 text-[11px] font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <PencilLine className="size-3.5" /> Düzenle
            </button>
            <button
              type="button"
              onClick={applyMenuPreset}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-2 text-[11px] font-black text-white transition hover:bg-emerald-400"
            >
              <LayoutTemplate className="size-3.5" /> 1. Menü Düzeni
            </button>
          </div>
        )}
        {orderSaved ? (
          <p className="mt-2 text-center text-[11px] font-bold text-emerald-400">
            1. Menü Düzeni kalıcı olarak kaydedildi
          </p>
        ) : editingNavigation ? (
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Sürükleyin veya okları kullanın; kayıt hesaba bağlanır
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
