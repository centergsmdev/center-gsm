"use client";

import { ChevronDown, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { adminPageTitles } from "@/data/admin/navigation";
import { useAdminAuth } from "@/providers/admin-auth-provider";
import { AdminRealtimeNotifications } from "./admin-realtime-notifications";

export function AdminHeader({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { user } = useAdminAuth();
  const meta =
    adminPageTitles[pathname] ??
    (pathname.startsWith("/admin/urunler/")
      ? {
          title: "Ürün düzenle",
          description: "Katalog bilgilerini ve yayın durumunu güncelleyin.",
        }
      : pathname.startsWith("/admin/siparisler/")
        ? {
            title: "Sipariş detayı",
            description: "Sipariş akışını, ödemeyi ve iç notları yönetin.",
          }
        : pathname.startsWith("/admin/iadeler/")
          ? {
              title: "RMA detayı",
              description: "Talebi, mesajları ve durum geçmişini yönetin.",
            }
          : adminPageTitles["/admin"]);
  return (
    <header className="sticky top-0 z-sticky border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-zinc-200 md:hidden"
          aria-label="Admin menüsünü aç"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black tracking-tight text-zinc-950 sm:text-xl">
            {meta.title}
          </h1>
          <p className="hidden truncate text-xs text-zinc-500 sm:block">
            {meta.description}
          </p>
        </div>
        <label className="hidden h-10 w-full max-w-xs items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 xl:flex">
          <Search className="size-4 text-zinc-400" />
          <span className="sr-only">Yönetim panelinde ara</span>
          <input
            type="search"
            placeholder="Panelde ara…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </label>
        <AdminRealtimeNotifications />
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-zinc-50"
          aria-label="Kullanıcı menüsünü aç"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-xs font-bold text-white">
            {user?.initials ?? "CG"}
          </span>
          <span className="hidden lg:block">
            <span className="block max-w-36 truncate text-xs font-bold text-zinc-900">
              {user?.name}
            </span>
            <span className="block max-w-36 truncate text-[11px] text-zinc-500">
              Yönetici
            </span>
          </span>
          <ChevronDown className="hidden size-4 text-zinc-400 lg:block" />
        </button>
      </div>
    </header>
  );
}
