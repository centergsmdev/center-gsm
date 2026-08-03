"use client";

import { BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import type { NotificationPreferences } from "@/types/account";

const options: {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}[] = [
  {
    key: "email",
    title: "E-posta bildirimleri",
    description: "Hesap ve hizmet duyurularını e-posta ile alın.",
  },
  {
    key: "sms",
    title: "SMS bildirimleri",
    description: "Önemli gelişmeleri telefonunuza alın.",
  },
  {
    key: "campaigns",
    title: "Kampanya bildirimleri",
    description: "İndirim ve fırsatlardan haberdar olun.",
  },
  {
    key: "orders",
    title: "Sipariş bildirimleri",
    description: "Sipariş ve kargo durumlarını takip edin.",
  },
];
export function NotificationSettings() {
  const { preferences } = useAuth();
  return (
    <Card className="p-5 sm:p-7">
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-center justify-between gap-5 rounded-lg border border-border p-4 transition-colors hover:bg-surface-subtle"
          >
            <span>
              <span className="block text-sm font-black">{option.title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                {option.description}
              </span>
            </span>
            <input
              type="checkbox"
              checked={preferences[option.key]}
              readOnly
              disabled
              className="size-5 shrink-0 accent-red-700"
            />
          </label>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900">
        <BellOff className="size-4 shrink-0" aria-hidden="true" />
        Bildirim tercihlerini kalıcı olarak kaydetme özelliği henüz
        kullanılamıyor.
      </p>
      <Button className="mt-6" disabled>
        Tercihleri Kaydet
      </Button>
    </Card>
  );
}
