"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogIn, LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";

export function AccountHeaderAction() {
  const router = useRouter();
  const { isAuthenticated, isReady, user, logout } = useAuth();
  if (!isReady)
    return (
      <span
        className="h-11 w-11 animate-pulse rounded-md bg-surface-subtle"
        aria-label="Hesap durumu yükleniyor"
      />
    );
  if (!isAuthenticated)
    return (
      <Link
        href="/giris"
        className="group relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-1 text-zinc-600 transition-colors hover:bg-surface-subtle hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-2"
      >
        <LogIn className="size-5" strokeWidth={1.7} aria-hidden="true" />
        <span className="hidden text-[10px] font-semibold xl:block">
          Giriş Yap
        </span>
      </Link>
    );
  return (
    <details className="group/account relative block">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-1 text-zinc-700 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-2">
        <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-xs font-black text-white">
          {user.firstName.charAt(0)}
        </span>
        <span className="hidden max-w-20 truncate text-xs font-bold xl:block">
          {user.firstName}
        </span>
        <ChevronDown
          className="hidden size-3.5 transition-transform group-open/account:rotate-180 xl:block"
          aria-hidden="true"
        />
      </summary>
      <div className="absolute right-0 top-full z-dropdown mt-2 w-56 rounded-lg border border-border bg-white p-2 shadow-xl">
        <p className="px-3 py-2 text-xs text-muted">
          Merhaba, <strong className="text-foreground">{user.firstName}</strong>
        </p>
        <Link
          href="/hesabim"
          className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-surface-subtle"
        >
          <UserRound className="size-4" aria-hidden="true" />
          Hesabım
        </Link>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-danger hover:bg-red-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Çıkış Yap
        </button>
      </div>
    </details>
  );
}
