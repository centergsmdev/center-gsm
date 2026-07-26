"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Edit3, Plus, Star, Trash2 } from "lucide-react";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import { AdminModal } from "@/components/admin/admin-modal-lazy";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { Button } from "@/components/ui/button";
import {
  createAdminPaymentAccount,
  deactivateAdminPaymentAccount,
  getAdminPaymentAccounts,
  setDefaultPaymentAccount,
  updateAdminPaymentAccount,
  type PaymentAccountValues,
} from "@/lib/admin/payment-accounts";
import type { Tables } from "@/types/database";

export function AdminPaymentSettings() {
  const [items, setItems] = useState<Tables<"payment_accounts">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<
    Tables<"payment_accounts"> | "new" | null
  >(null);
  const [pending, setPending] = useState<Tables<"payment_accounts"> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminPaymentAccounts();
    if (result.data) {
      setItems(result.data);
      setError("");
    } else setError(result.error ?? "Hesaplar yüklenemedi.");
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const iban = String(form.get("iban")).replace(/\s/g, "").toUpperCase();
    const values: PaymentAccountValues = {
      bank_name: String(form.get("bankName")).trim(),
      account_holder: String(form.get("accountHolder")).trim(),
      iban,
      branch: String(form.get("branch")).trim() || null,
      description: String(form.get("description")).trim() || null,
      is_active: form.get("isActive") === "on",
      is_default: form.get("isDefault") === "on",
    };
    if (
      !values.bank_name ||
      !values.account_holder ||
      !/^TR\d{24}$/.test(iban)
    ) {
      setError(
        "Banka, hesap sahibi ve 26 karakterli TR IBAN bilgisini kontrol edin.",
      );
      return;
    }
    setSaving(true);
    const result =
      editor !== "new" && editor
        ? await updateAdminPaymentAccount(editor.id, values)
        : await createAdminPaymentAccount(values);
    setSaving(false);
    if (!result.data) {
      setError(result.error ?? "Hesap kaydedilemedi.");
      return;
    }
    setEditor(null);
    setNotice("Banka hesabı kaydedildi.");
    await load();
  };
  const deactivate = async () => {
    if (!pending) return;
    setSaving(true);
    const result = await deactivateAdminPaymentAccount(pending.id);
    setSaving(false);
    setPending(null);
    if (!result.data) setError(result.error ?? "Hesap pasif yapılamadı.");
    else {
      setNotice("Banka hesabı pasif duruma alındı.");
      await load();
    }
  };
  const makeDefault = async (id: string) => {
    setSaving(true);
    const result = await setDefaultPaymentAccount(id);
    setSaving(false);
    if (!result.data)
      setError(result.error ?? "Varsayılan hesap değiştirilemedi.");
    else {
      setNotice("Varsayılan banka hesabı güncellendi.");
      await load();
    }
  };
  return (
    <div className="space-y-4">
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      <AdminCard>
        <AdminCardHeader
          title="Havale / EFT hesapları"
          description="Checkout'ta gösterilecek aktif banka hesaplarını yönetin."
          action={
            <Button size="sm" onClick={() => setEditor("new")}>
              <Plus className="size-4" />
              Yeni hesap
            </Button>
          }
        />
        {loading ? (
          <AdminLoadingState />
        ) : error && !items.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : items.length ? (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-zinc-950 text-white">
                    <Building2 className="size-5" />
                  </span>
                  <div className="flex gap-2">
                    <AdminBadge
                      variant={item.is_active ? "success" : "neutral"}
                    >
                      {item.is_active ? "Aktif" : "Pasif"}
                    </AdminBadge>
                    {item.is_default ? (
                      <AdminBadge variant="info">Varsayılan</AdminBadge>
                    ) : null}
                  </div>
                </div>
                <h2 className="mt-4 font-black">{item.bank_name}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {item.account_holder}
                </p>
                <p className="mt-3 break-all font-mono text-sm font-bold">
                  {item.iban.replace(/(.{4})/g, "$1 ").trim()}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {item.branch || "Şube belirtilmedi"} ·{" "}
                  {item.description || "Açıklama yok"}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  {item.is_active && !item.is_default ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void makeDefault(item.id)}
                      disabled={saving}
                    >
                      <Star className="size-4" />
                      Varsayılan yap
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditor(item)}
                  >
                    <Edit3 className="size-4" />
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPending(item)}
                  >
                    <Trash2 className="size-4" />
                    Pasif yap
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Banka hesabı bulunmuyor"
            description="Havale siparişlerini açmak için en az bir aktif hesap ekleyin."
          />
        )}
      </AdminCard>
      <AdminModal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={
          editor === "new" ? "Yeni banka hesabı" : "Banka hesabını düzenle"
        }
        description="IBAN yalnızca ödeme talimatlarında gösterilir."
      >
        {editor ? (
          <AccountForm
            item={editor === "new" ? null : editor}
            saving={saving}
            submit={save}
          />
        ) : null}
      </AdminModal>
      <AdminModal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Hesap pasif yapılsın mı?"
        description="Yeni siparişlerde bu IBAN gösterilmeyecek."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={() => void deactivate()}
              disabled={saving}
            >
              Pasif yap
            </Button>
          </>
        }
      />
    </div>
  );
}
function AccountForm({
  item,
  saving,
  submit,
}: {
  item: Tables<"payment_accounts"> | null;
  saving: boolean;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Banka" name="bankName" value={item?.bank_name} />
      <Field
        label="Hesap sahibi"
        name="accountHolder"
        value={item?.account_holder}
      />
      <Field
        label="IBAN"
        name="iban"
        value={item?.iban}
        placeholder="TR00 0000 0000 0000 0000 0000 00"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Şube" name="branch" value={item?.branch ?? ""} />
        <Field
          label="Açıklama"
          name="description"
          value={item?.description ?? ""}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          name="isActive"
          label="Aktif"
          checked={item?.is_active ?? true}
        />
        <Toggle
          name="isDefault"
          label="Varsayılan hesap"
          checked={item?.is_default ?? false}
        />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}
function Field({
  label,
  name,
  value,
  placeholder,
}: {
  label: string;
  name: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        required={name !== "branch" && name !== "description"}
        className={adminControlClass}
      />
    </label>
  );
}
function Toggle({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-sm font-bold">
      <span>{label}</span>
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="size-5 accent-red-600"
      />
    </label>
  );
}
