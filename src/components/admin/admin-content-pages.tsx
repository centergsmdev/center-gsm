"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ContentPageRecord } from "@/types/database";
import { AdminField, AdminFormSection, adminControlClass } from "./admin-form";

export function AdminContentPages() {
  const [pages, setPages] = useState<ContentPageRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const client = createClient();
    if (!client) return setError("İçerik servisine bağlanılamadı.");
    void client
      .from("content_pages")
      .select("*")
      .order("title")
      .then(({ data, error: loadError }) => {
        if (loadError) setError("Sayfa içerikleri yüklenemedi.");
        else {
          setPages(data);
          setSelected(data[0]?.slug ?? "");
        }
      });
  }, []);

  const page = pages.find((item) => item.slug === selected);
  const update = <K extends keyof ContentPageRecord>(
    key: K,
    value: ContentPageRecord[K],
  ) =>
    setPages((current) =>
      current.map((item) =>
        item.slug === selected ? { ...item, [key]: value } : item,
      ),
    );

  async function save() {
    if (!page) return;
    setSaving(true);
    setError("");
    setMessage("");
    const client = createClient();
    const auth = client ? await client.auth.getUser() : null;
    const result = client
      ? await client
          .from("content_pages")
          .update({
            eyebrow: page.eyebrow.trim(),
            title: page.title.trim(),
            description: page.description.trim(),
            body_html: page.body_html,
            is_published: page.is_published,
            updated_at: new Date().toISOString(),
            updated_by: auth?.data.user?.id ?? null,
          })
          .eq("slug", page.slug)
      : { error: new Error() };
    if (result.error)
      setError("İçerik kaydedilemedi. Yönetici oturumunu kontrol edin.");
    else setMessage("Sayfa içeriği kaydedildi ve yayına aktarıldı.");
    setSaving(false);
  }

  if (!page && !error)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
        <span className="ml-2">Sayfalar yükleniyor...</span>
      </div>
    );
  return (
    <div className="space-y-6">
      {error && !page ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {page ? (
        <>
          <AdminFormSection title="Düzenlenecek sayfa">
            <div className="grid gap-5 md:grid-cols-2">
              <AdminField label="Sayfa" htmlFor="content-page">
                <select
                  id="content-page"
                  value={selected}
                  onChange={(event) => {
                    setSelected(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  className={adminControlClass}
                >
                  {pages.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </AdminField>
              <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 text-sm font-semibold">
                <span>Sayfada yayınla</span>
                <input
                  type="checkbox"
                  checked={page.is_published}
                  onChange={(event) =>
                    update("is_published", event.target.checked)
                  }
                  className="size-5 accent-red-600"
                />
              </label>
            </div>
          </AdminFormSection>
          <AdminFormSection title="Başlık bilgileri">
            <div className="grid gap-5 md:grid-cols-2">
              <AdminField label="Üst etiket" htmlFor="eyebrow">
                <input
                  id="eyebrow"
                  value={page.eyebrow}
                  onChange={(e) => update("eyebrow", e.target.value)}
                  className={adminControlClass}
                />
              </AdminField>
              <AdminField label="Sayfa başlığı" htmlFor="page-title">
                <input
                  id="page-title"
                  value={page.title}
                  onChange={(e) => update("title", e.target.value)}
                  className={adminControlClass}
                />
              </AdminField>
              <AdminField
                label="Kısa açıklama"
                htmlFor="page-description"
                className="md:col-span-2"
              >
                <textarea
                  id="page-description"
                  rows={3}
                  value={page.description}
                  onChange={(e) => update("description", e.target.value)}
                  className={`${adminControlClass} h-auto py-3`}
                />
              </AdminField>
            </div>
          </AdminFormSection>
          <AdminFormSection title="Sayfa metni">
            <RichTextEditor
              id={`content-${page.slug}`}
              value={page.body_html}
              onChange={(value) => update("body_html", value)}
              ariaLabel={`${page.title} içeriği`}
            />
          </AdminFormSection>
          <div className="sticky bottom-4 flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <span
              className={`mr-auto flex items-center gap-2 text-sm font-semibold ${error ? "text-red-700" : "text-emerald-700"}`}
            >
              {error ? (
                <AlertCircle className="size-4" />
              ) : message ? (
                <CheckCircle2 className="size-4" />
              ) : null}
              {error || message}
            </span>
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving || !page.title.trim()}
            >
              {saving ? "Kaydediliyor..." : "İçeriği kaydet"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
