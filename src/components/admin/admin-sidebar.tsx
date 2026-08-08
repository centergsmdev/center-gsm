"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  const { logout } = useAdminAuth();
  const [unreadChats, setUnreadChats] = useState(0);
  const [activity, setActivity] = useState<AdminActivityState>(
    emptyAdminActivityState,
  );

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
      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        aria-label="Admin menüsü"
      >
        {adminNavigation.map((item) => {
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
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              title={!mobile ? item.label : undefined}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                "child" in item && item.child && "ml-3 h-10 text-xs",
                active
                  ? "bg-red-600 text-white shadow-lg shadow-red-950/20"
                  : hasNewActivity
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-950/25 hover:bg-emerald-500 hover:text-white"
                    : "text-zinc-400 hover:bg-white/[.07] hover:text-white",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className={cn(!mobile && "hidden lg:block")}>
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
