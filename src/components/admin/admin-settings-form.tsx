"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { SiteSettings } from "@/types/database";
import { AdminField, AdminFormSection, adminControlClass } from "./admin-form";

type Status = {
  kind: "idle" | "loading" | "saving" | "success" | "error";
  message?: string;
};

export function AdminSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    const client = createClient();
    if (!client)
      return setStatus({
        kind: "error",
        message: "Ayar servisine bağlanılamadı.",
      });
    void client
      .from("site_settings")
      .select("*")
      .eq("id", true)
      .single()
      .then(({ data, error }) => {
        if (error)
          setStatus({
            kind: "error",
            message:
              "Ayarlar yüklenemedi. Veritabanı güncellemesini kontrol edin.",
          });
        else {
          setSettings(data);
          setStatus({ kind: "idle" });
        }
      });
  }, []);

  const update = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) =>
    setSettings((current) =>
      current ? { ...current, [key]: value } : current,
    );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    const client = createClient();
    if (!client)
      return setStatus({
        kind: "error",
        message: "Ayar servisine bağlanılamadı.",
      });
    setStatus({ kind: "saving" });
    const { data: auth } = await client.auth.getUser();
    const { error } = await client
      .from("site_settings")
      .update({
        company_name: settings.company_name.trim(),
        tax_number: settings.tax_number?.trim() || null,
        contact_email: settings.contact_email?.trim() || null,
        phone: settings.phone?.trim() || null,
        address: settings.address?.trim() || null,
        instagram_url: settings.instagram_url?.trim() || null,
        youtube_url: settings.youtube_url?.trim() || null,
        twitter_url: settings.twitter_url?.trim() || null,
        free_shipping_limit: settings.free_shipping_limit,
        same_day_shipping_enabled: settings.same_day_shipping_enabled,
        phone_approval_enabled: settings.phone_approval_enabled,
        bank_transfer_enabled: settings.bank_transfer_enabled,
        updated_at: new Date().toISOString(),
        updated_by: auth.user?.id ?? null,
      })
      .eq("id", true);
    setStatus(
      error
        ? {
            kind: "error",
            message: "Ayarlar kaydedilemedi. Yönetici yetkisini kontrol edin.",
          }
        : {
            kind: "success",
            message: "Ayarlar kaydedildi ve site görünümüne aktarıldı.",
          },
    );
  }

  if (!settings)
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
        <span className="ml-2">Ayarlar yükleniyor...</span>
      </div>
    );
  const text = (key: keyof SiteSettings) => ({
    value: String(settings[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(key, e.target.value as never),
  });
  return (
    <form className="space-y-6" onSubmit={save}>
      <AdminFormSection title="Firma bilgileri">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminField label="Firma unvanı" htmlFor="company">
            <input
              id="company"
              className={adminControlClass}
              {...text("company_name")}
            />
          </AdminField>
          <AdminField label="Vergi numarası" htmlFor="tax">
            <input
              id="tax"
              className={adminControlClass}
              {...text("tax_number")}
            />
          </AdminField>
        </div>
      </AdminFormSection>
      <AdminFormSection title="İletişim">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminField label="E-posta" htmlFor="contact-email">
            <input
              id="contact-email"
              type="email"
              className={adminControlClass}
              {...text("contact_email")}
            />
          </AdminField>
          <AdminField label="Telefon" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              className={adminControlClass}
              {...text("phone")}
            />
          </AdminField>
          <AdminField label="Adres" htmlFor="address" className="md:col-span-2">
            <textarea
              id="address"
              rows={3}
              className={`${adminControlClass} h-auto py-3`}
              {...text("address")}
            />
          </AdminField>
        </div>
      </AdminFormSection>
      <AdminFormSection title="Sosyal medya">
        <div className="grid gap-5 md:grid-cols-3">
          <AdminField label="Instagram URL" htmlFor="instagram">
            <input
              id="instagram"
              className={adminControlClass}
              placeholder="https://instagram.com/..."
              {...text("instagram_url")}
            />
          </AdminField>
          <AdminField label="YouTube URL" htmlFor="youtube">
            <input
              id="youtube"
              className={adminControlClass}
              {...text("youtube_url")}
            />
          </AdminField>
          <AdminField label="X / Twitter URL" htmlFor="twitter">
            <input
              id="twitter"
              className={adminControlClass}
              {...text("twitter_url")}
            />
          </AdminField>
        </div>
      </AdminFormSection>
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminFormSection title="Kargo ayarları">
          <div className="space-y-5">
            <AdminField label="Ücretsiz kargo limiti" htmlFor="shipping-limit">
              <input
                id="shipping-limit"
                type="number"
                min="0"
                className={adminControlClass}
                value={settings.free_shipping_limit}
                onChange={(e) =>
                  update("free_shipping_limit", Number(e.target.value))
                }
              />
            </AdminField>
            <Toggle
              label="Aynı gün kargo aktif"
              checked={settings.same_day_shipping_enabled}
              onChange={(v) => update("same_day_shipping_enabled", v)}
            />
          </div>
        </AdminFormSection>
        <AdminFormSection title="Ödeme görünürlüğü">
          <div className="space-y-4">
            <Toggle
              label="Online Kart ile Öde (Telefon ile Onay)"
              checked={settings.phone_approval_enabled}
              onChange={(v) => update("phone_approval_enabled", v)}
            />
            <Toggle
              label="Havale / EFT"
              checked={settings.bank_transfer_enabled}
              onChange={(v) => update("bank_transfer_enabled", v)}
            />
          </div>
        </AdminFormSection>
      </div>
      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-4 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <span
          className={`mr-auto flex items-center gap-2 text-sm font-semibold ${status.kind === "error" ? "text-red-700" : "text-emerald-700"}`}
        >
          {status.kind === "error" ? (
            <AlertCircle className="size-4" />
          ) : status.kind === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : null}
          {status.message}
        </span>
        <Button type="submit" disabled={status.kind === "saving"}>
          {status.kind === "saving"
            ? "Kaydediliyor..."
            : "Değişiklikleri kaydet"}
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-sm font-semibold">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-red-600"
      />
    </label>
  );
}
