"use client";
import Link from "next/link";
import { Bell, FileText, ListChecks, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
import { getNotificationDashboard } from "@/lib/notifications";
export function AdminNotificationDashboard() {
  const [data, setData] = useState<{
    templates: number;
    pending: number;
    sent: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getNotificationDashboard().then((result) => {
      setData(result.data);
      setError(result.error ?? "");
    });
  }, []);
  if (error) return <AdminErrorState />;
  if (!data) return <AdminLoadingState />;
  const cards = [
    {
      label: "Aktif şablonlar",
      value: data.templates,
      icon: FileText,
      href: "/admin/bildirim-sablonlari",
    },
    {
      label: "Bekleyen kuyruk",
      value: data.pending,
      icon: ListChecks,
      href: "/admin/bildirim-kuyrugu",
    },
    {
      label: "Başarılı gönderim",
      value: data.sent,
      icon: Send,
      href: "/admin/bildirim-kuyrugu",
    },
    {
      label: "Başarısız",
      value: data.failed,
      icon: Bell,
      href: "/admin/bildirim-kuyrugu",
    },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link prefetch={false} href={href} key={label}>
            <AdminCard className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <Icon className="size-5 text-red-600" />
              <p className="mt-5 text-3xl font-black text-zinc-950">{value}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                {label}
              </p>
            </AdminCard>
          </Link>
        ))}
      </div>
      <AdminCard>
        <AdminCardHeader
          title="Notification Center"
          description="E-posta, SMS, WhatsApp, push ve uygulama içi kanallar tek merkezden yönetilir."
        />
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <LinkBox
            href="/admin/bildirim-sablonlari"
            title="Şablonlar"
            text="İçerikleri, değişkenleri ve kanal ayarlarını yönetin."
          />
          <LinkBox
            href="/admin/bildirim-kuyrugu"
            title="Kuyruk"
            text="Bekleyen ve yeniden denenecek bildirimleri izleyin."
          />
          <LinkBox
            href="/admin/bildirim-kuyrugu?view=logs"
            title="Gönderim geçmişi"
            text="Mock provider sonuçlarını ve hata kayıtlarını inceleyin."
          />
        </div>
      </AdminCard>
    </div>
  );
}
function LinkBox({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className="rounded-xl border border-zinc-200 p-4 hover:border-zinc-400"
    >
      <strong className="text-zinc-950">{title}</strong>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
    </Link>
  );
}
