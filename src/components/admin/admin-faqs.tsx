"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import { AdminModal } from "@/components/admin/admin-modal";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { FaqItem } from "@/types/database";

type FaqDraft = Pick<
  FaqItem,
  "category" | "question" | "answer" | "sort_order" | "is_published"
>;

const categorySuggestions = [
  "Elden taksit",
  "Ödeme",
  "Mağaza ve güven",
  "Sipariş ve teslimat",
];

export function AdminFaqs() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<FaqItem | null>(null);
  const [draft, setDraft] = useState<FaqDraft>(emptyDraft(10));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const client = createClient();
    const result = client
      ? await client
          .from("faq_items")
          .select("*")
          .order("sort_order")
          .order("created_at")
      : { data: null, error: new Error() };
    setLoading(false);
    if (result.error || !result.data) {
      setError(
        "Sık sorulan sorular yüklenemedi. Yönetici oturumunu kontrol edin.",
      );
      return;
    }
    setItems(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    if (!normalized) return items;
    return items.filter((item) =>
      `${item.category} ${item.question} ${item.answer}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalized),
    );
  }, [items, query]);

  function startCreate() {
    const nextOrder = items.length
      ? Math.min(10000, Math.max(...items.map((item) => item.sort_order)) + 10)
      : 10;
    setDraft(emptyDraft(nextOrder));
    setEditing(null);
    setCreating(true);
    setError("");
  }

  function startEdit(item: FaqItem) {
    setDraft({
      category: item.category,
      question: item.question,
      answer: item.answer,
      sort_order: item.sort_order,
      is_published: item.is_published,
    });
    setCreating(false);
    setEditing(item);
    setError("");
  }

  function closeEditor() {
    if (saving) return;
    setCreating(false);
    setEditing(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const client = createClient();
    const userResult = client ? await client.auth.getUser() : null;
    const payload = {
      category: draft.category.trim(),
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      sort_order: Math.max(0, Math.min(10000, Number(draft.sort_order) || 0)),
      is_published: draft.is_published,
      updated_by: userResult?.data.user?.id ?? null,
    };
    const result = !client
      ? { error: new Error() }
      : editing
        ? await client.from("faq_items").update(payload).eq("id", editing.id)
        : await client.from("faq_items").insert(payload);
    setSaving(false);
    if (result.error) {
      setError(
        "Soru kaydedilemedi. Alanları ve yönetici yetkinizi kontrol edin.",
      );
      return;
    }
    closeEditor();
    setNotice(
      editing ? "Soru ve cevap güncellendi." : "Yeni soru ve cevap eklendi.",
    );
    await load();
  }

  async function togglePublished(item: FaqItem) {
    setSaving(true);
    setError("");
    const client = createClient();
    const result = client
      ? await client
          .from("faq_items")
          .update({ is_published: !item.is_published })
          .eq("id", item.id)
      : { error: new Error() };
    setSaving(false);
    if (result.error) return setError("Yayın durumu değiştirilemedi.");
    setNotice(
      item.is_published ? "Soru yayından kaldırıldı." : "Soru yayınlandı.",
    );
    await load();
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    setError("");
    const client = createClient();
    const result = client
      ? await client.from("faq_items").delete().eq("id", deleting.id)
      : { error: new Error() };
    setSaving(false);
    if (result.error) return setError("Soru silinemedi.");
    setDeleting(null);
    setNotice("Soru kalıcı olarak silindi.");
    await load();
  }

  const editorOpen = creating || Boolean(editing);
  return (
    <div className="space-y-4">
      {notice ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error && items.length ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <AdminCard>
        <AdminCardHeader
          title="Sık sorulan sorular"
          description={`${items.length} soru · Müşteri bilgi sayfasındaki soru ve cevapları yönetin.`}
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-4" /> Yeni soru
            </Button>
          }
        />
        <div className="border-b border-zinc-100 p-4">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3">
            <Search className="size-4 text-zinc-400" aria-hidden="true" />
            <span className="sr-only">Sorularda ara</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Soru, cevap veya kategori ara…"
              className="w-full text-sm outline-none"
            />
          </label>
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : error && !items.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : visible.length ? (
          <AdminTable label="Sık sorulan soru yönetimi">
            <thead>
              <tr>
                <AdminTh>Sıra</AdminTh>
                <AdminTh>Kategori</AdminTh>
                <AdminTh>Soru ve cevap</AdminTh>
                <AdminTh>Durum</AdminTh>
                <AdminTh className="text-right">İşlem</AdminTh>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <AdminTd>
                    <span className="font-black">{item.sort_order}</span>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge variant="info">{item.category}</AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <p className="max-w-lg font-bold text-zinc-950">
                      {item.question}
                    </p>
                    <p className="mt-1 line-clamp-2 max-w-lg text-xs leading-5 text-zinc-500">
                      {item.answer}
                    </p>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={item.is_published ? "success" : "neutral"}
                    >
                      {item.is_published ? "Yayında" : "Taslak"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <div className="flex justify-end gap-1">
                      <IconButton
                        label={
                          item.is_published ? "Yayından kaldır" : "Yayınla"
                        }
                        onClick={() => void togglePublished(item)}
                      >
                        {item.is_published ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </IconButton>
                      <IconButton
                        label="Düzenle"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Sil"
                        danger
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="Soru bulunamadı"
            description="Arama ifadesini değiştirin veya yeni bir soru ekleyin."
            action={startCreate}
          />
        )}
      </AdminCard>

      <AdminModal
        open={editorOpen}
        onClose={closeEditor}
        title={editing ? "Soruyu düzenle" : "Yeni soru ve cevap ekle"}
        description="Yayınlanan içerik Sık Sorulan Sorular sayfasında müşterilere gösterilir."
        wide
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Field label="Kategori">
              <input
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value })
                }
                list="faq-categories"
                required
                minLength={2}
                maxLength={80}
                className={adminControlClass}
                placeholder="Örn. Elden taksit"
              />
              <datalist id="faq-categories">
                {categorySuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
            <Field label="Görünme sırası">
              <input
                type="number"
                min={0}
                max={10000}
                value={draft.sort_order}
                onChange={(event) =>
                  setDraft({ ...draft, sort_order: Number(event.target.value) })
                }
                required
                className={adminControlClass}
              />
            </Field>
          </div>
          <Field label="Soru">
            <input
              value={draft.question}
              onChange={(event) =>
                setDraft({ ...draft, question: event.target.value })
              }
              required
              minLength={5}
              maxLength={240}
              className={adminControlClass}
              placeholder="Müşterinin sorusunu yazın"
            />
          </Field>
          <Field label="Cevap">
            <textarea
              value={draft.answer}
              onChange={(event) =>
                setDraft({ ...draft, answer: event.target.value })
              }
              required
              minLength={10}
              maxLength={4000}
              rows={8}
              className={`${adminControlClass} h-auto py-3 leading-6`}
              placeholder="Kısa, açık ve güncel cevabı yazın"
            />
          </Field>
          <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold">
            <span>
              Müşteri sayfasında yayınla
              <span className="mt-1 block text-xs font-normal text-zinc-500">
                Kapalıysa kayıt taslak olarak yalnız admin panelde görünür.
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.is_published}
              onChange={(event) =>
                setDraft({ ...draft, is_published: event.target.checked })
              }
              className="size-5 accent-red-600"
            />
          </label>
          <Button type="submit" disabled={saving} className="w-full">
            {saving
              ? "Kaydediliyor…"
              : editing
                ? "Değişiklikleri kaydet"
                : "Soruyu ekle"}
          </Button>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(deleting)}
        onClose={() => !saving && setDeleting(null)}
        title="Soru kalıcı olarak silinsin mi?"
        description={deleting?.question}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              disabled={saving}
              onClick={() => void remove()}
            >
              {saving ? "Siliniyor…" : "Soruyu sil"}
            </Button>
          </>
        }
      />
    </div>
  );
}

function emptyDraft(sortOrder: number): FaqDraft {
  return {
    category: "",
    question: "",
    answer: "",
    sort_order: sortOrder,
    is_published: true,
  };
}

function IconButton({
  label,
  children,
  onClick,
  danger = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-zinc-100"}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
