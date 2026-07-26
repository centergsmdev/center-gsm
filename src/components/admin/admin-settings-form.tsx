"use client";

import { useState, type FormEvent } from "react";
import { Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField, AdminFormSection, adminControlClass } from "./admin-form";

export function AdminSettingsForm() {
  const [saved, setSaved] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };
  return (
    <form onSubmit={submit} className="space-y-6">
      <AdminFormSection title="Firma bilgileri">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminField label="Firma unvanı" htmlFor="company">
            <input
              id="company"
              className={adminControlClass}
              defaultValue="CENTER GSM Teknoloji A.Ş."
            />
          </AdminField>
          <AdminField label="Vergi numarası" htmlFor="tax">
            <input
              id="tax"
              className={adminControlClass}
              placeholder="0000000000"
            />
          </AdminField>
          <AdminField label="Logo" htmlFor="logo" className="md:col-span-2">
            <label
              htmlFor="logo"
              className="flex h-24 cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-600 hover:border-red-300"
            >
              <Upload className="size-5" />
              Logo dosyası seç
              <input
                id="logo"
                type="file"
                accept="image/*"
                className="sr-only"
              />
            </label>
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
              defaultValue="destek@centergsm.com"
            />
          </AdminField>
          <AdminField label="Telefon" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              className={adminControlClass}
              defaultValue="0850 000 00 00"
            />
          </AdminField>
          <AdminField label="Adres" htmlFor="address" className="md:col-span-2">
            <textarea
              id="address"
              rows={3}
              className={`${adminControlClass} h-auto py-3`}
            />
          </AdminField>
        </div>
      </AdminFormSection>
      <AdminFormSection title="Sosyal medya">
        <div className="grid gap-5 md:grid-cols-3">
          <AdminField label="Instagram" htmlFor="instagram">
            <input
              id="instagram"
              className={adminControlClass}
              placeholder="@centergsm"
            />
          </AdminField>
          <AdminField label="YouTube" htmlFor="youtube">
            <input
              id="youtube"
              className={adminControlClass}
              placeholder="Kanal URL"
            />
          </AdminField>
          <AdminField label="X / Twitter" htmlFor="twitter">
            <input
              id="twitter"
              className={adminControlClass}
              placeholder="@centergsm"
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
                className={adminControlClass}
                defaultValue="1500"
              />
            </AdminField>
            <label className="flex items-center justify-between text-sm font-semibold">
              <span>Aynı gün kargo aktif</span>
              <input
                type="checkbox"
                defaultChecked
                className="size-5 accent-red-600"
              />
            </label>
          </div>
        </AdminFormSection>
        <AdminFormSection title="Ödeme ayarları">
          <div className="space-y-4">
            <label className="flex items-center justify-between text-sm font-semibold">
                  <span>Online Kart ile Öde (Telefon ile Onay)</span>
              <input
                type="checkbox"
                defaultChecked
                className="size-5 accent-red-600"
              />
            </label>
            <label className="flex items-center justify-between text-sm font-semibold">
              <span>Havale / EFT</span>
              <input
                type="checkbox"
                defaultChecked
                className="size-5 accent-red-600"
              />
            </label>
          </div>
        </AdminFormSection>
      </div>
      <div className="sticky bottom-4 flex items-center justify-end gap-4 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        {saved ? (
          <span
            className="flex items-center gap-2 text-sm font-bold text-emerald-700"
            role="status"
          >
            <Check className="size-4" />
            Ayarlar demo olarak kaydedildi
          </span>
        ) : null}
        <Button type="submit">Değişiklikleri kaydet</Button>
      </div>
    </form>
  );
}
