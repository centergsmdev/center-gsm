"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";

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
  const { preferences, updatePreferences } = useAuth();
  const [draft, setDraft] = useState(preferences);
  const [saved, setSaved] = useState(false);
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
              checked={draft[option.key]}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  [option.key]: event.target.checked,
                }));
                setSaved(false);
              }}
              className="size-5 shrink-0 accent-red-700"
            />
          </label>
        ))}
      </div>
      {saved ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-xs font-bold text-success"
        >
          <Check className="size-4" />
          Bildirim tercihleri güncellendi.
        </p>
      ) : null}
      <Button
        className="mt-6"
        onClick={() => {
          updatePreferences(draft);
          setSaved(true);
        }}
      >
        <Save className="size-4" />
        Tercihleri Kaydet
      </Button>
    </Card>
  );
}
