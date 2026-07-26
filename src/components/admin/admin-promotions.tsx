"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import { AdminModal } from "@/components/admin/admin-modal-lazy";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import {
  createAdminCampaign,
  createAdminCoupon,
  deactivateAdminCampaign,
  deactivateAdminCoupon,
  getAdminCampaigns,
  getAdminCoupons,
  getPromotionTargets,
  updateAdminCampaign,
  updateAdminCoupon,
} from "@/lib/admin/promotions";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/types/database";
import type {
  CampaignFormValues,
  CouponFormValues,
  PromotionFilters,
} from "@/types/promotion";

const initialFilters: PromotionFilters = { query: "", status: "all" };
const dateInput = (value: string) => new Date(value).toISOString().slice(0, 16);
const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateInput(date.toISOString());
};
const nextMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return dateInput(date.toISOString());
};
const numberOrNull = (value: FormDataEntryValue | null) =>
  String(value ?? "").trim() ? Number(value) : null;
const status = (active: boolean, starts: string, ends: string) =>
  !active
    ? "Pasif"
    : new Date(starts) > new Date()
      ? "Planlandı"
      : new Date(ends) < new Date()
        ? "Sona erdi"
        : "Aktif";

export function AdminCampaigns() {
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState<Tables<"campaigns">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Tables<"campaigns"> | "new" | null>(
    null,
  );
  const [pending, setPending] = useState<Tables<"campaigns"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<
    Awaited<ReturnType<typeof getPromotionTargets>>
  >({ categories: [], brands: [], products: [] });
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminCampaigns(filters);
    if (result.data) {
      setItems(result.data);
      setError("");
    } else setError(result.error ?? "Kampanyalar yüklenemedi.");
    setLoading(false);
  }, [filters]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    void getPromotionTargets().then(setTargets);
  }, []);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const targetType = String(form.get("targetType"));
    const values: CampaignFormValues = {
      name: String(form.get("name")).trim(),
      slug: String(form.get("slug")).trim().toLowerCase(),
      description: String(form.get("description")).trim() || null,
      discount_type: String(form.get("discountType")) as "percentage" | "fixed",
      discount_value: Number(form.get("discountValue")),
      minimum_order_amount: Number(form.get("minimumOrder") || 0),
      maximum_discount_amount: numberOrNull(form.get("maximumDiscount")),
      starts_at: new Date(String(form.get("startsAt"))).toISOString(),
      ends_at: new Date(String(form.get("endsAt"))).toISOString(),
      is_active: form.get("isActive") === "on",
      category_id:
        targetType === "category" ? String(form.get("targetId")) : null,
      brand_id: targetType === "brand" ? String(form.get("targetId")) : null,
      product_id:
        targetType === "product" ? String(form.get("targetId")) : null,
    };
    if (
      !values.name ||
      !values.slug ||
      values.discount_value <= 0 ||
      values.ends_at <= values.starts_at
    ) {
      setError("Zorunlu alanları ve tarih aralığını kontrol edin.");
      return;
    }
    setSaving(true);
    const result =
      editor !== "new" && editor
        ? await updateAdminCampaign(editor.id, values)
        : await createAdminCampaign(values);
    setSaving(false);
    if (!result.data) {
      setError(result.error ?? "Kampanya kaydedilemedi.");
      return;
    }
    setEditor(null);
    setNotice("Kampanya kaydedildi.");
    await load();
  };
  const deactivate = async () => {
    if (!pending) return;
    setSaving(true);
    const result = await deactivateAdminCampaign(pending.id);
    setSaving(false);
    setPending(null);
    if (!result.data) setError(result.error ?? "Kampanya pasif yapılamadı.");
    else {
      setNotice("Kampanya pasif duruma alındı.");
      await load();
    }
  };
  return (
    <PromotionShell
      title="Kampanya listesi"
      description={`${items.length} kampanya · Supabase verisi`}
      filters={filters}
      setFilters={setFilters}
      onNew={() => setEditor("new")}
      newLabel="Yeni kampanya"
      notice={notice}
    >
      {loading ? (
        <AdminLoadingState />
      ) : error && !items.length ? (
        <AdminErrorState retry={() => void load()} />
      ) : items.length ? (
        <AdminTable label="Kampanya yönetimi">
          <thead>
            <tr>
              <AdminTh>Kampanya</AdminTh>
              <AdminTh>İndirim</AdminTh>
              <AdminTh>Hedef</AdminTh>
              <AdminTh>Tarih</AdminTh>
              <AdminTh>Durum</AdminTh>
              <AdminTh className="text-right">İşlem</AdminTh>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <AdminTd>
                  <p className="font-bold text-zinc-950">{item.name}</p>
                  <p className="text-xs text-zinc-500">/{item.slug}</p>
                </AdminTd>
                <AdminTd>
                  {item.discount_type === "percentage"
                    ? `%${item.discount_value}`
                    : formatCurrency(item.discount_value)}
                </AdminTd>
                <AdminTd>
                  {item.product_id
                    ? "Ürün"
                    : item.category_id
                      ? "Kategori"
                      : item.brand_id
                        ? "Marka"
                        : "Tüm ürünler"}
                </AdminTd>
                <AdminTd className="text-xs">
                  {new Intl.DateTimeFormat("tr-TR").format(
                    new Date(item.starts_at),
                  )}{" "}
                  –{" "}
                  {new Intl.DateTimeFormat("tr-TR").format(
                    new Date(item.ends_at),
                  )}
                </AdminTd>
                <AdminTd>
                  <AdminBadge
                    variant={
                      status(item.is_active, item.starts_at, item.ends_at) ===
                      "Aktif"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {status(item.is_active, item.starts_at, item.ends_at)}
                  </AdminBadge>
                </AdminTd>
                <AdminTd>
                  <Actions
                    edit={() => setEditor(item)}
                    remove={() => setPending(item)}
                    name={item.name}
                  />
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmptyState
          title="Kampanya bulunamadı"
          description="Filtreleri değiştirin veya yeni kampanya oluşturun."
        />
      )}
      <AdminModal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={editor === "new" ? "Yeni kampanya" : "Kampanyayı düzenle"}
        description="İndirim ve hedefleme kurallarını belirleyin."
      >
        {editor ? (
          <CampaignForm
            item={editor === "new" ? null : editor}
            targets={targets}
            saving={saving}
            onSubmit={save}
          />
        ) : null}
      </AdminModal>
      <Confirm
        open={Boolean(pending)}
        title="Kampanya pasif yapılsın mı?"
        saving={saving}
        close={() => setPending(null)}
        confirm={() => void deactivate()}
      />
    </PromotionShell>
  );
}

export function AdminCoupons() {
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState<Tables<"coupons">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Tables<"coupons"> | "new" | null>(null);
  const [pending, setPending] = useState<Tables<"coupons"> | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminCoupons(filters);
    if (result.data) {
      setItems(result.data);
      setError("");
    } else setError(result.error ?? "Kuponlar yüklenemedi.");
    setLoading(false);
  }, [filters]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: CouponFormValues = {
      code: String(form.get("code")).trim().toUpperCase(),
      description: String(form.get("description")).trim() || null,
      discount_type: String(form.get("discountType")) as "percentage" | "fixed",
      discount_value: Number(form.get("discountValue")),
      minimum_order_amount: Number(form.get("minimumOrder") || 0),
      maximum_discount_amount: numberOrNull(form.get("maximumDiscount")),
      usage_limit: numberOrNull(form.get("usageLimit")),
      usage_limit_per_user: numberOrNull(form.get("userLimit")),
      starts_at: new Date(String(form.get("startsAt"))).toISOString(),
      ends_at: new Date(String(form.get("endsAt"))).toISOString(),
      is_active: form.get("isActive") === "on",
    };
    if (
      !values.code ||
      values.discount_value <= 0 ||
      values.ends_at <= values.starts_at
    ) {
      setError("Kupon kodu, indirim ve tarih alanlarını kontrol edin.");
      return;
    }
    setSaving(true);
    const result =
      editor !== "new" && editor
        ? await updateAdminCoupon(editor.id, values)
        : await createAdminCoupon(values);
    setSaving(false);
    if (!result.data) {
      setError(result.error ?? "Kupon kaydedilemedi.");
      return;
    }
    setEditor(null);
    setNotice("Kupon kaydedildi.");
    await load();
  };
  const deactivate = async () => {
    if (!pending) return;
    setSaving(true);
    const result = await deactivateAdminCoupon(pending.id);
    setSaving(false);
    setPending(null);
    if (!result.data) setError(result.error ?? "Kupon pasif yapılamadı.");
    else {
      setNotice("Kupon pasif duruma alındı.");
      await load();
    }
  };
  return (
    <PromotionShell
      title="Kupon listesi"
      description={`${items.length} kupon · Kodlar yalnızca adminlere görünür`}
      filters={filters}
      setFilters={setFilters}
      onNew={() => setEditor("new")}
      newLabel="Yeni kupon"
      notice={notice}
    >
      {loading ? (
        <AdminLoadingState />
      ) : error && !items.length ? (
        <AdminErrorState retry={() => void load()} />
      ) : items.length ? (
        <AdminTable label="Kupon yönetimi">
          <thead>
            <tr>
              <AdminTh>Kod</AdminTh>
              <AdminTh>İndirim</AdminTh>
              <AdminTh>Minimum</AdminTh>
              <AdminTh>Limit</AdminTh>
              <AdminTh>Durum</AdminTh>
              <AdminTh className="text-right">İşlem</AdminTh>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <AdminTd className="font-mono font-bold text-zinc-950">
                  {item.code}
                </AdminTd>
                <AdminTd>
                  {item.discount_type === "percentage"
                    ? `%${item.discount_value}`
                    : formatCurrency(item.discount_value)}
                </AdminTd>
                <AdminTd>{formatCurrency(item.minimum_order_amount)}</AdminTd>
                <AdminTd>
                  {item.usage_limit ?? "Sınırsız"} / kişi{" "}
                  {item.usage_limit_per_user ?? "∞"}
                </AdminTd>
                <AdminTd>
                  <AdminBadge
                    variant={
                      status(item.is_active, item.starts_at, item.ends_at) ===
                      "Aktif"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {status(item.is_active, item.starts_at, item.ends_at)}
                  </AdminBadge>
                </AdminTd>
                <AdminTd>
                  <Actions
                    edit={() => setEditor(item)}
                    remove={() => setPending(item)}
                    name={item.code}
                  />
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmptyState
          title="Kupon bulunamadı"
          description="Filtreleri değiştirin veya yeni kupon oluşturun."
        />
      )}
      <AdminModal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={editor === "new" ? "Yeni kupon" : "Kuponu düzenle"}
        description="Kullanım ve sepet koşullarını belirleyin."
      >
        {editor ? (
          <CouponFormAdmin
            item={editor === "new" ? null : editor}
            saving={saving}
            onSubmit={save}
          />
        ) : null}
      </AdminModal>
      <Confirm
        open={Boolean(pending)}
        title="Kupon pasif yapılsın mı?"
        saving={saving}
        close={() => setPending(null)}
        confirm={() => void deactivate()}
      />
    </PromotionShell>
  );
}

function PromotionShell({
  title,
  description,
  filters,
  setFilters,
  onNew,
  newLabel,
  notice,
  children,
}: {
  title: string;
  description: string;
  filters: PromotionFilters;
  setFilters: (value: PromotionFilters) => void;
  onNew: () => void;
  newLabel: string;
  notice: string;
  children: React.ReactNode;
}) {
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
      <AdminCard>
        <AdminCardHeader
          title={title}
          description={description}
          action={
            <Button size="sm" onClick={onNew}>
              <Plus className="size-4" />
              {newLabel}
            </Button>
          }
        />
        <div className="grid gap-3 border-b border-zinc-100 p-4 md:grid-cols-[1fr_180px]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3">
            <Search className="size-4 text-zinc-400" />
            <span className="sr-only">Ara</span>
            <input
              type="search"
              value={filters.query}
              onChange={(event) =>
                setFilters({ ...filters, query: event.target.value })
              }
              placeholder="Ara…"
              className="w-full text-sm outline-none"
            />
          </label>
          <select
            aria-label="Durum filtresi"
            value={filters.status}
            onChange={(event) =>
              setFilters({
                ...filters,
                status: event.target.value as PromotionFilters["status"],
              })
            }
            className={adminControlClass}
          >
            <option value="all">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
        {children}
      </AdminCard>
    </div>
  );
}
function Actions({
  edit,
  remove,
  name,
}: {
  edit: () => void;
  remove: () => void;
  name: string;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={edit}
        className="grid size-9 place-items-center rounded-lg hover:bg-zinc-100"
        aria-label={`${name} düzenle`}
      >
        <Edit3 className="size-4" />
      </button>
      <button
        type="button"
        onClick={remove}
        className="grid size-9 place-items-center rounded-lg hover:bg-red-50 hover:text-red-600"
        aria-label={`${name} pasif yap`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
function Confirm({
  open,
  title,
  saving,
  close,
  confirm,
}: {
  open: boolean;
  title: string;
  saving: boolean;
  close: () => void;
  confirm: () => void;
}) {
  return (
    <AdminModal
      open={open}
      onClose={close}
      title={title}
      description="Kayıt fiziksel olarak silinmeyecek."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Vazgeç
          </Button>
          <Button variant="danger" onClick={confirm} disabled={saving}>
            {saving ? "İşleniyor…" : "Pasif yap"}
          </Button>
        </>
      }
    />
  );
}
function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={type === "number" ? "0.01" : undefined}
        className={adminControlClass}
      />
    </label>
  );
}
function SharedDiscountFields({
  item,
}: {
  item: {
    discount_type: string;
    discount_value: number;
    minimum_order_amount: number;
    maximum_discount_amount: number | null;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
  } | null;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-bold">İndirim tipi</span>
          <select
            name="discountType"
            defaultValue={item?.discount_type ?? "percentage"}
            className={adminControlClass}
          >
            <option value="percentage">Yüzde</option>
            <option value="fixed">Sabit tutar</option>
          </select>
        </label>
        <Field
          label="İndirim değeri"
          name="discountValue"
          type="number"
          min={0.01}
          required
          defaultValue={item?.discount_value ?? 10}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Minimum sepet"
          name="minimumOrder"
          type="number"
          min={0}
          defaultValue={item?.minimum_order_amount ?? 0}
        />
        <Field
          label="Maksimum indirim"
          name="maximumDiscount"
          type="number"
          min={0.01}
          defaultValue={item?.maximum_discount_amount ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Başlangıç"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={item ? dateInput(item.starts_at) : tomorrow()}
        />
        <Field
          label="Bitiş"
          name="endsAt"
          type="datetime-local"
          required
          defaultValue={item ? dateInput(item.ends_at) : nextMonth()}
        />
      </div>
      <label className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-sm font-bold">
        <span>Aktif</span>
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={item?.is_active ?? true}
          className="size-5 accent-red-600"
        />
      </label>
    </>
  );
}
function CampaignForm({
  item,
  targets,
  saving,
  onSubmit,
}: {
  item: Tables<"campaigns"> | null;
  targets: Awaited<ReturnType<typeof getPromotionTargets>>;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const targetType = item?.product_id
    ? "product"
    : item?.category_id
      ? "category"
      : item?.brand_id
        ? "brand"
        : "all";
  const targetId =
    item?.product_id ?? item?.category_id ?? item?.brand_id ?? "";
  const [target, setTarget] = useState(targetType);
  const options =
    target === "category"
      ? targets.categories
      : target === "brand"
        ? targets.brands
        : targets.products;
  return (
    <form
      onSubmit={onSubmit}
      className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
    >
      <Field
        label="Kampanya adı"
        name="name"
        required
        defaultValue={item?.name}
      />
      <Field label="Slug" name="slug" required defaultValue={item?.slug} />
      <label className="block">
        <span className="mb-2 block text-sm font-bold">Açıklama</span>
        <textarea
          name="description"
          defaultValue={item?.description ?? ""}
          rows={2}
          className={`${adminControlClass} h-auto py-3`}
        />
      </label>
      <SharedDiscountFields item={item} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-bold">Hedef</span>
          <select
            name="targetType"
            value={target}
            onChange={(event) => setTarget(event.target.value as typeof target)}
            className={adminControlClass}
          >
            <option value="all">Tüm ürünler</option>
            <option value="category">Kategori</option>
            <option value="brand">Marka</option>
            <option value="product">Ürün</option>
          </select>
        </label>
        {target !== "all" ? (
          <label>
            <span className="mb-2 block text-sm font-bold">Seçim</span>
            <select
              name="targetId"
              defaultValue={targetId}
              required
              className={adminControlClass}
            >
              <option value="">Seçin</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}
function CouponFormAdmin({
  item,
  saving,
  onSubmit,
}: {
  item: Tables<"coupons"> | null;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
    >
      <Field
        label="Kupon kodu"
        name="code"
        required
        defaultValue={item?.code}
      />
      <label className="block">
        <span className="mb-2 block text-sm font-bold">Açıklama</span>
        <textarea
          name="description"
          defaultValue={item?.description ?? ""}
          rows={2}
          className={`${adminControlClass} h-auto py-3`}
        />
      </label>
      <SharedDiscountFields item={item} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Toplam kullanım limiti"
          name="usageLimit"
          type="number"
          min={1}
          defaultValue={item?.usage_limit ?? ""}
        />
        <Field
          label="Kullanıcı başına limit"
          name="userLimit"
          type="number"
          min={1}
          defaultValue={item?.usage_limit_per_user ?? ""}
        />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}
