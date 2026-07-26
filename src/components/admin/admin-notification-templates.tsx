"use client";
import { Edit3, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminTable, AdminTd, AdminTh } from "./admin-table";
import { AdminModal } from "./admin-modal-lazy";
import { Button } from "@/components/ui/button";
import {
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  TEMPLATE_PLACEHOLDERS,
  extractTemplateVariables,
  getNotificationTemplates,
  placeholderToken,
  renderTemplate,
  saveNotificationTemplate,
} from "@/lib/notifications";
import type { NotificationTemplate, TemplateInput } from "@/lib/notifications";
const empty: TemplateInput = {
  code: "",
  name: "",
  channel: "email",
  subject: "",
  body: "",
  variables: [],
  is_active: true,
};
const samples: Record<string, string> = {
  customer_name: "Ayşe Yılmaz",
  order_number: "CG-2026-12345678",
  tracking_number: "TRK123456",
  product_name: "Nova X Pro",
  total_amount: "₺42.999",
  company_name: "CENTER GSM",
};
export function AdminNotificationTemplates() {
  const [items, setItems] = useState<NotificationTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<TemplateInput | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getNotificationTemplates(query);
    setItems(result.data ?? []);
    setError(result.error ?? "");
    setLoading(false);
  }, [query]);
  useEffect(() => {
    void load();
  }, [load]);
  const preview = useMemo(
    () =>
      editor
        ? {
            subject: renderTemplate(editor.subject, samples),
            body: renderTemplate(editor.body, samples),
          }
        : null,
    [editor],
  );
  const edit = (item: NotificationTemplate) =>
    setEditor({
      id: item.id,
      code: item.code,
      name: item.name,
      channel: item.channel,
      subject: item.subject ?? "",
      body: item.body,
      variables: Array.isArray(item.variables)
        ? item.variables.filter((v): v is string => typeof v === "string")
        : [],
      is_active: item.is_active,
    });
  const save = async () => {
    if (
      !editor ||
      !editor.code.trim() ||
      !editor.name.trim() ||
      !editor.body.trim()
    ) {
      setError("Kod, ad ve içerik zorunludur.");
      return;
    }
    setSaving(true);
    const input = {
      ...editor,
      variables: extractTemplateVariables(editor.subject, editor.body),
    };
    const result = await saveNotificationTemplate(input);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditor(null);
    setNotice("Bildirim şablonu kaydedildi.");
    await load();
  };
  return (
    <div className="space-y-4">
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      <AdminCard>
        <AdminCardHeader
          title="Bildirim şablonları"
          description="Kanal içeriklerini ve kullanılabilir değişkenleri yönetin."
          action={
            <Button size="sm" onClick={() => setEditor(empty)}>
              <Plus className="size-4" />
              Yeni şablon
            </Button>
          }
        />
        <label className="m-4 flex h-11 max-w-md items-center gap-2 rounded-xl border border-zinc-200 px-3">
          <Search className="size-4 text-zinc-400" />
          <span className="sr-only">Şablon ara</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kod veya şablon adı ara…"
            className="w-full outline-none"
          />
        </label>
        {loading ? (
          <AdminLoadingState />
        ) : error && !items.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : items.length ? (
          <AdminTable label="Bildirim şablonları">
            <thead>
              <tr>
                <AdminTh>Şablon</AdminTh>
                <AdminTh>Kanal</AdminTh>
                <AdminTh>Konu</AdminTh>
                <AdminTh>Değişkenler</AdminTh>
                <AdminTh>Durum</AdminTh>
                <AdminTh>İşlem</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <AdminTd>
                    <p className="font-bold text-zinc-950">{item.name}</p>
                    <p className="font-mono text-xs text-zinc-500">
                      {item.code}
                    </p>
                  </AdminTd>
                  <AdminTd>{CHANNEL_LABELS[item.channel]}</AdminTd>
                  <AdminTd>{item.subject ?? "—"}</AdminTd>
                  <AdminTd className="text-xs">
                    {Array.isArray(item.variables)
                      ? item.variables.join(", ")
                      : "—"}
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={item.is_active ? "success" : "neutral"}
                    >
                      {item.is_active ? "Aktif" : "Pasif"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${item.name} düzenle`}
                      onClick={() => edit(item)}
                    >
                      <Edit3 className="size-4" />
                    </Button>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <AdminEmptyState title="Şablon bulunamadı" />
        )}
      </AdminCard>
      <AdminModal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={editor?.id ? "Şablonu düzenle" : "Yeni bildirim şablonu"}
        description="Placeholder değerleri gönderim sırasında güvenli biçimde değiştirilir."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditor(null)}>
              Vazgeç
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </>
        }
      >
        {editor ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <Field
                label="Kod"
                value={editor.code}
                onChange={(value) =>
                  setEditor({
                    ...editor,
                    code: value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  })
                }
              />
              <Field
                label="Ad"
                value={editor.name}
                onChange={(value) => setEditor({ ...editor, name: value })}
              />
              <label className="block text-sm font-bold">
                Kanal
                <select
                  value={editor.channel}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      channel: e.target.value as TemplateInput["channel"],
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 font-normal"
                >
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {CHANNEL_LABELS[channel]}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Konu"
                value={editor.subject}
                onChange={(value) => setEditor({ ...editor, subject: value })}
              />
              <label className="block text-sm font-bold">
                İçerik
                <textarea
                  rows={7}
                  value={editor.body}
                  onChange={(e) =>
                    setEditor({ ...editor, body: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 p-3 font-normal"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={editor.is_active}
                  onChange={(e) =>
                    setEditor({ ...editor, is_active: e.target.checked })
                  }
                />
                Aktif
              </label>
            </div>
            <div>
              <p className="text-sm font-bold">Canlı önizleme</p>
              <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="font-bold">{preview?.subject || "Konu yok"}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                  {preview?.body || "İçerik önizlemesi"}
                </p>
              </div>
              <p className="mt-5 text-sm font-bold">Placeholder listesi</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TEMPLATE_PLACEHOLDERS.map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() =>
                      setEditor({
                        ...editor,
                        body: `${editor.body}${editor.body ? " " : ""}${placeholderToken(name)}`,
                      })
                    }
                    className="rounded-lg bg-zinc-100 px-2 py-1 font-mono text-xs hover:bg-zinc-200"
                  >
                    {placeholderToken(name)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 font-normal"
      />
    </label>
  );
}
