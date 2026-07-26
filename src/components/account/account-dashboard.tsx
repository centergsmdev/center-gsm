"use client";

import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Heart,
  MapPin,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { demoTrackedOrder } from "@/data/demo-order";
import { useFavorites } from "@/providers/favorites-provider";
import { useAuth } from "@/providers/auth-provider";

const shortcuts = [
  {
    href: "/hesabim/siparislerim",
    label: "Siparişlerim",
    description: "Geçmiş ve güncel siparişler",
    icon: Package,
  },
  {
    href: "/hesabim/adreslerim",
    label: "Adreslerim",
    description: "Teslimat adreslerinizi yönetin",
    icon: MapPin,
  },
  {
    href: "/favoriler",
    label: "Favorilerim",
    description: "Kaydettiğiniz ürünler",
    icon: Heart,
  },
  {
    href: "/hesabim/bilgilerim",
    label: "Kişisel Bilgilerim",
    description: "İletişim bilgilerinizi düzenleyin",
    icon: UserRound,
  },
  {
    href: "/hesabim/guvenlik",
    label: "Şifre ve Güvenlik",
    description: "Hesap güvenliği seçenekleri",
    icon: ShieldCheck,
  },
  {
    href: "/hesabim/bildirimler",
    label: "Bildirim Tercihleri",
    description: "İletişim izinlerinizi yönetin",
    icon: Bell,
  },
];
export function AccountDashboard() {
  const { user, addresses } = useAuth();
  const { count } = useFavorites();
  return (
    <div>
      <Card className="overflow-hidden bg-zinc-950 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
          Hoş geldiniz
        </p>
        <h2 className="mt-2 text-2xl font-black">Merhaba, {user.firstName}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          Siparişlerinizi ve hesap tercihlerinizi güvenle tek noktadan yönetin.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Metric value="1" label="Sipariş" />
          <Metric value={String(count)} label="Favori" />
          <Metric value={String(addresses.length)} label="Adres" />
        </div>
      </Card>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {shortcuts.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-lg bg-surface-subtle text-zinc-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black">{label}</h2>
                <p className="mt-1 text-xs text-muted">{description}</p>
              </div>
              <ChevronRight
                className="size-4 text-muted transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          </Link>
        ))}
      </div>
      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted">Son sipariş</p>
            <h2 className="mt-1 font-black">{demoTrackedOrder.orderNumber}</h2>
          </div>
          <Link
            href={`/siparis/${demoTrackedOrder.orderNumber}`}
            className="text-xs font-bold text-primary"
          >
            Detayı Gör
          </Link>
        </div>
      </Card>
    </div>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] text-zinc-400">{label}</p>
    </div>
  );
}
