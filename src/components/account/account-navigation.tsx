"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Heart,
  Home,
  LockKeyhole,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Trophy,
  WalletCards,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const links = [
  { href: "/hesabim", label: "Hesap Özeti", icon: Home },
  { href: "/hesabim/siparislerim", label: "Siparişlerim", icon: Package },
  { href: "/hesabim/iadeler", label: "İade ve Değişim", icon: RotateCcw },
  { href: "/hesabim/puanlarim", label: "Puanlarım", icon: Trophy },
  { href: "/hesabim/bakiyem", label: "Bakiyem", icon: WalletCards },
  { href: "/hesabim/adreslerim", label: "Adreslerim", icon: MapPin },
  { href: "/favoriler", label: "Favorilerim", icon: Heart },
  { href: "/hesabim/bilgilerim", label: "Kişisel Bilgilerim", icon: UserRound },
  { href: "/hesabim/guvenlik", label: "Şifre ve Güvenlik", icon: LockKeyhole },
  { href: "/hesabim/bildirimler", label: "Bildirim Tercihleri", icon: Bell },
];

export function AccountNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  function signOut() {
    logout();
    router.push("/");
  }
  return (
    <aside className="rounded-xl border border-border bg-white p-3 shadow-sm lg:sticky lg:top-36">
      <div className="flex items-center gap-3 p-3">
        <span className="grid size-11 place-items-center rounded-full bg-zinc-950 text-sm font-black text-white">
          {user.firstName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-[11px] text-muted">{user.email}</p>
        </div>
      </div>
      <nav
        aria-label="Hesap menüsü"
        className="mt-2 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:w-full",
                active
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-surface-subtle hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={signOut}
          className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold text-danger transition-colors hover:bg-red-50 lg:mt-2 lg:w-full"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Çıkış Yap
        </button>
      </nav>
    </aside>
  );
}
