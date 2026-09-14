"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

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
import {
  formatWhatsAppPhone,
  MAX_WHATSAPP_REPRESENTATIVE_IMAGE_SIZE,
  normalizeWhatsAppPhone,
  representativeInitials,
  WHATSAPP_REPRESENTATIVE_BUCKET,
} from "@/lib/contact/whatsapp";
import { createClient } from "@/lib/supabase/client";
import type { WhatsAppRepresentative } from "@/types/database";

type RepresentativeDraft = Pick<
  WhatsAppRepresentative,
  | "full_name"
  | "title"
  | "phone_e164"
  | "photo_url"
  | "photo_path"
  | "sort_order"
  | "is_active"
>;

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AdminWhatsAppRepresentatives() {
  const [items, setItems] = useState<WhatsAppRepresentative[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<WhatsAppRepresentative | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<WhatsAppRepresentative | null>(null);
  const [draft, setDraft] = useState<RepresentativeDraft>(emptyDraft(10));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const client = createClient();
    const result = client
      ? await client
          .from("whatsapp_representatives")
          .select("*")
          .order("sort_order")
          .order("created_at")
      : { data: null, error: new Error() };
    setLoading(false);
    if (result.error || !result.data) {
      setError(
        "WhatsApp temsilcileri yüklenemedi. Yönetici oturumunu ve veritabanı güncellemesini kontrol edin.",
      );
      return;
    }
    setItems(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    if (!normalized) return items;
    return items.filter((item) =>
      `${item.full_name} ${item.title} ${item.phone_e164}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalized),
    );
  }, [items, query]);

  function resetPhotoPreview(next: string | null) {
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(next);
  }

  function startCreate() {
    const nextOrder = items.length
      ? Math.min(10000, Math.max(...items.map((item) => item.sort_order)) + 10)
      : 10;
    setDraft(emptyDraft(nextOrder));
    setEditing(null);
    setCreating(true);
    setPhotoFile(null);
    resetPhotoPreview(null);
    setError("");
  }

  function startEdit(item: WhatsAppRepresentative) {
    setDraft({
      full_name: item.full_name,
      title: item.title,
      phone_e164: item.phone_e164,
      photo_url: item.photo_url,
      photo_path: item.photo_path,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setCreating(false);
    setEditing(item);
    setPhotoFile(null);
    resetPhotoPreview(item.photo_url);
    setError("");
  }

  function closeEditor() {
    if (saving) return;
    setCreating(false);
    setEditing(null);
    setPhotoFile(null);
    resetPhotoPreview(null);
  }

  function choosePhoto(file?: File) {
    if (!file) return;
    if (!acceptedImageTypes.has(file.type)) {
      setError("Temsilci fotoğrafı JPEG, PNG veya WebP olmalıdır.");
      return;
    }
    if (file.size > MAX_WHATSAPP_REPRESENTATIVE_IMAGE_SIZE) {
      setError("Temsilci fotoğrafı en fazla 4 MB olabilir.");
      return;
    }
    setError("");
    setPhotoFile(file);
    resetPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhotoFile(null);
    setDraft({ ...draft, photo_url: null, photo_path: null });
    resetPhotoPreview(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = normalizeWhatsAppPhone(draft.phone_e164);
    if (!normalizedPhone) {
      setError("Geçerli bir WhatsApp numarası girin. Örnek: 0555 555 55 55");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    const client = createClient();
    if (!client) {
      setSaving(false);
      setError("Supabase bağlantısı kullanılamıyor.");
      return;
    }

    const userResult = await client.auth.getUser();
    const representativeId = editing?.id ?? crypto.randomUUID();
    let uploadedPath: string | null = null;
    let nextPhotoUrl = draft.photo_url;
    let nextPhotoPath = draft.photo_path;

    try {
      if (photoFile) {
        const extension = imageExtension(photoFile.type);
        uploadedPath = `${representativeId}/${crypto.randomUUID()}.${extension}`;
        const uploaded = await client.storage
          .from(WHATSAPP_REPRESENTATIVE_BUCKET)
          .upload(uploadedPath, photoFile, {
            cacheControl: "31536000",
            contentType: photoFile.type,
            upsert: false,
          });
        if (uploaded.error) throw uploaded.error;
        nextPhotoPath = uploadedPath;
        nextPhotoUrl = client.storage
          .from(WHATSAPP_REPRESENTATIVE_BUCKET)
          .getPublicUrl(uploadedPath).data.publicUrl;
      }

      const payload = {
        full_name: draft.full_name.trim(),
        title: draft.title.trim(),
        phone_e164: normalizedPhone,
        photo_url: nextPhotoUrl,
        photo_path: nextPhotoPath,
        sort_order: Math.max(0, Math.min(10000, Number(draft.sort_order) || 0)),
        is_active: draft.is_active,
        updated_by: userResult.data.user?.id ?? null,
      };
      const result = editing
        ? await client
            .from("whatsapp_representatives")
            .update(payload)
            .eq("id", editing.id)
        : await client
            .from("whatsapp_representatives")
            .insert({ id: representativeId, ...payload });
      if (result.error) throw result.error;

      if (editing?.photo_path && editing.photo_path !== nextPhotoPath) {
        await client.storage
          .from(WHATSAPP_REPRESENTATIVE_BUCKET)
          .remove([editing.photo_path]);
      }

      setSaving(false);
      closeEditor();
      setNotice(
        editing
          ? "Temsilci bilgileri güncellendi."
          : "Yeni WhatsApp temsilcisi eklendi.",
      );
      await load();
    } catch {
      if (uploadedPath) {
        await client.storage
          .from(WHATSAPP_REPRESENTATIVE_BUCKET)
          .remove([uploadedPath]);
      }
      setError(
        "Temsilci kaydedilemedi. Alanları, fotoğrafı ve yönetici yetkinizi kontrol edin.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: WhatsAppRepresentative) {
    setSaving(true);
    setError("");
    const client = createClient();
    const result = client
      ? await client
          .from("whatsapp_representatives")
          .update({ is_active: !item.is_active })
          .eq("id", item.id)
      : { error: new Error() };
    setSaving(false);
    if (result.error)
      return setError("Temsilcinin yayın durumu değiştirilemedi.");
    setNotice(
      item.is_active
        ? "Temsilci müşteri seçiminden kaldırıldı."
        : "Temsilci müşteri seçimine eklendi.",
    );
    await load();
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    setError("");
    const client = createClient();
    const result = client
      ? await client
          .from("whatsapp_representatives")
          .delete()
          .eq("id", deleting.id)
      : { error: new Error() };
    if (result.error) {
      setSaving(false);
      setError("Temsilci silinemedi.");
      return;
    }
    if (client && deleting.photo_path) {
      await client.storage
        .from(WHATSAPP_REPRESENTATIVE_BUCKET)
        .remove([deleting.photo_path]);
    }
    setSaving(false);
    setDeleting(null);
    setNotice("Temsilci kalıcı olarak silindi.");
    await load();
  }

  const editorOpen = creating || Boolean(editing);
  const activeCount = items.filter((item) => item.is_active).length;

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
          title="WhatsApp müşteri temsilcileri"
          description={`${items.length} temsilci · ${activeCount} aktif · Müşteri seçim ekranını yönetin.`}
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-4" /> Yeni temsilci
            </Button>
          }
        />
        <div className="border-b border-zinc-100 p-4">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3">
            <Search className="size-4 text-zinc-400" aria-hidden="true" />
            <span className="sr-only">Temsilcilerde ara</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="İsim, görev veya telefon ara…"
              className="w-full text-sm outline-none"
            />
          </label>
        </div>
        {loading ? (
          <AdminLoadingState />
        ) : error && !items.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : visible.length ? (
          <AdminTable label="WhatsApp temsilci yönetimi">
            <thead>
              <tr>
                <AdminTh>Sıra</AdminTh>
                <AdminTh>Temsilci</AdminTh>
                <AdminTh>WhatsApp</AdminTh>
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
                    <div className="flex items-center gap-3">
                      <Avatar item={item} />
                      <div>
                        <p className="font-black text-zinc-950">
                          {item.full_name}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </AdminTd>
                  <AdminTd>
                    <span className="inline-flex items-center gap-2 font-bold">
                      <MessageCircle className="size-4 text-emerald-600" />
                      {formatWhatsAppPhone(item.phone_e164)}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={item.is_active ? "success" : "neutral"}
                    >
                      {item.is_active ? "Aktif" : "Pasif"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <div className="flex justify-end gap-1">
                      <IconButton
                        label={item.is_active ? "Pasife al" : "Aktif et"}
                        onClick={() => void toggleActive(item)}
                      >
                        {item.is_active ? (
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
            title={
              items.length ? "Temsilci bulunamadı" : "Henüz temsilci eklenmedi"
            }
            description={
              items.length
                ? "Arama ifadesini değiştirin."
                : "İlk temsilciyi ekleyene kadar mevcut genel WhatsApp numarası çalışmaya devam eder."
            }
            action={items.length ? undefined : startCreate}
          />
        )}
      </AdminCard>

      <AdminModal
        open={editorOpen}
        onClose={closeEditor}
        title={editing ? "Temsilciyi düzenle" : "Yeni WhatsApp temsilcisi ekle"}
        description="Aktif temsilciler müşterinin WhatsApp seçim ekranında görünür."
        wide
      >
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div>
              <span className="mb-2 block text-sm font-bold">
                Temsilci fotoğrafı
              </span>
              <div className="flex items-center gap-3 md:block">
                <div
                  className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-zinc-950 bg-cover bg-center text-2xl font-black text-white shadow ring-1 ring-zinc-200 md:mx-auto md:size-32"
                  style={
                    photoPreview
                      ? {
                          backgroundImage: `url(${JSON.stringify(photoPreview)})`,
                        }
                      : undefined
                  }
                >
                  {photoPreview ? null : draft.full_name.trim() ? (
                    representativeInitials(draft.full_name)
                  ) : (
                    <UserRound className="size-10" />
                  )}
                </div>
                <div className="space-y-2 md:mt-4">
                  <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 text-xs font-bold transition hover:border-zinc-950">
                    <ImagePlus className="size-4" /> Fotoğraf seç
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => choosePhoto(event.target.files?.[0])}
                    />
                  </label>
                  {photoPreview ? (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-full text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <X className="size-4" /> Fotoğrafı kaldır
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                JPEG, PNG veya WebP · En fazla 4 MB
              </p>
            </div>

            <div className="space-y-4">
              <Field label="Ad soyad">
                <input
                  value={draft.full_name}
                  onChange={(event) =>
                    setDraft({ ...draft, full_name: event.target.value })
                  }
                  required
                  minLength={2}
                  maxLength={100}
                  className={adminControlClass}
                  placeholder="Örn. Ayşe Yılmaz"
                />
              </Field>
              <Field label="Görev / unvan">
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  required
                  minLength={2}
                  maxLength={80}
                  className={adminControlClass}
                  placeholder="Müşteri Temsilcisi"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
                <Field label="WhatsApp numarası">
                  <input
                    type="tel"
                    value={draft.phone_e164}
                    onChange={(event) =>
                      setDraft({ ...draft, phone_e164: event.target.value })
                    }
                    required
                    className={adminControlClass}
                    placeholder="0555 555 55 55"
                  />
                </Field>
                <Field label="Görünme sırası">
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={draft.sort_order}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        sort_order: Number(event.target.value),
                      })
                    }
                    required
                    className={adminControlClass}
                  />
                </Field>
              </div>
              <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold">
                <span>
                  Müşteri seçiminde göster
                  <span className="mt-1 block text-xs font-normal text-zinc-500">
                    Kapalıysa temsilci yalnız admin panelinde görünür.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(event) =>
                    setDraft({ ...draft, is_active: event.target.checked })
                  }
                  className="size-5 accent-emerald-600"
                />
              </label>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving
              ? "Kaydediliyor…"
              : editing
                ? "Değişiklikleri kaydet"
                : "Temsilciyi ekle"}
          </Button>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(deleting)}
        onClose={() => !saving && setDeleting(null)}
        title="Temsilci kalıcı olarak silinsin mi?"
        description={deleting?.full_name}
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
              {saving ? "Siliniyor…" : "Temsilciyi sil"}
            </Button>
          </>
        }
      />
    </div>
  );
}

function emptyDraft(sortOrder: number): RepresentativeDraft {
  return {
    full_name: "",
    title: "Müşteri Temsilcisi",
    phone_e164: "",
    photo_url: null,
    photo_path: null,
    sort_order: sortOrder,
    is_active: true,
  };
}

function imageExtension(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function Avatar({ item }: { item: WhatsAppRepresentative }) {
  return (
    <span
      className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-950 bg-cover bg-center text-sm font-black text-white ring-1 ring-zinc-200"
      style={
        item.photo_url
          ? { backgroundImage: `url(${JSON.stringify(item.photo_url)})` }
          : undefined
      }
      aria-hidden="true"
    >
      {item.photo_url ? null : representativeInitials(item.full_name)}
    </span>
  );
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
