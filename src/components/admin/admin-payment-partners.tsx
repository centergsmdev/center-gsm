"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { adminControlClass } from "@/components/admin/admin-form";
import { AdminModal } from "@/components/admin/admin-modal-lazy";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/admin-states";
import { PartnerLogo } from "@/components/shared/partner-logo";
import { Button } from "@/components/ui/button";
import {
  createAdminPaymentPartner,
  getAdminPaymentPartners,
  setDefaultPaymentPartner,
  updateAdminPaymentPartner,
} from "@/payments/repository/payment-partner-repository";
import type { Tables } from "@/types/database";

export function AdminPaymentPartners() {
  const [items, setItems] = useState<Tables<"payment_partners">[]>([]);
  const [edit, setEdit] = useState<
    Tables<"payment_partners"> | null | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminPaymentPartners();
    if (result.data) {
      setItems(result.data);
      setError("");
    } else {
      setError(result.error ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => void load(), [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const sortOrder = Number(form.get("sortOrder"));
    if (!name || !Number.isInteger(sortOrder) || sortOrder < 0) {
      setError("Ad ve sıfırdan büyük geçerli bir görünme sırası girin.");
      return;
    }

    setSaving(true);
    const values = {
      name,
      logo_url: String(form.get("logoUrl")).trim() || null,
      is_active: form.get("active") === "on",
      sort_order: sortOrder,
    };
    const result = edit
      ? await updateAdminPaymentPartner(edit.id, values)
      : await createAdminPaymentPartner(values);

    if (result.data) {
      setNotice("Ödeme çözüm ortağı kaydedildi.");
      setError("");
      setEdit(undefined);
      await load();
    } else {
      setError(result.error ?? "");
    }
    setSaving(false);
  }

  async function makeDefault(id: string) {
    setSaving(true);
    const result = await setDefaultPaymentPartner(id);
    if (result.data) {
      setNotice("Varsayılan ödeme çözüm ortağı güncellendi.");
      setError("");
      await load();
    } else {
      setError(result.error ?? "");
    }
    setSaving(false);
  }

  async function toggleActive(item: Tables<"payment_partners">) {
    setSaving(true);
    const result = await updateAdminPaymentPartner(item.id, {
      is_active: !item.is_active,
      is_default: item.is_active ? false : item.is_default,
    });
    if (result.data) {
      setNotice(
        item.is_active ? "Ortak pasife alındı." : "Ortak aktif edildi.",
      );
      setError("");
      await load();
    } else {
      setError(result.error ?? "");
    }
    setSaving(false);
  }

  return (
    <AdminCard>
      <AdminCardHeader
        title="Ödeme çözüm ortakları"
        description="Ana sayfada gösterilecek ödeme markalarını ve sıralamasını yönetin."
        action={
          <Button type="button" onClick={() => setEdit(null)}>
            Ortak ekle
          </Button>
        }
      />
      {notice ? (
        <p
          role="status"
          className="m-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="m-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <AdminLoadingState />
      ) : items.length ? (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-[72px] shrink-0 place-items-center rounded-2xl border bg-white shadow-sm">
                  <PartnerLogo name={item.name} logoUrl={item.logo_url} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-black">{item.name}</h2>
                    <span className="text-xs font-bold text-zinc-500">
                      {item.is_default
                        ? "Varsayılan"
                        : item.is_active
                          ? "Aktif"
                          : "Pasif"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Görünme sırası: {item.sort_order}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEdit(item)}
                >
                  Düzenle
                </Button>
                {item.is_active && !item.is_default ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => void makeDefault(item.id)}
                  >
                    Varsayılan yap
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant={item.is_active ? "danger" : "ghost"}
                  disabled={saving}
                  onClick={() => void toggleActive(item)}
                >
                  {item.is_active ? "Pasife al" : "Aktif et"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : (
        <AdminEmptyState
          title="Ödeme çözüm ortağı bulunamadı"
          description="Ana sayfada göstermek için ilk ödeme ortağınızı ekleyin."
        />
      )}

      <AdminModal
        open={edit !== undefined}
        onClose={() => !saving && setEdit(undefined)}
        title={edit ? "Ödeme ortağını düzenle" : "Ödeme ortağı ekle"}
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm font-bold">
            Ad
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={edit?.name ?? ""}
              className={`${adminControlClass} mt-1`}
            />
          </label>
          <label className="block text-sm font-bold">
            Logo URL
            <input
              name="logoUrl"
              inputMode="url"
              defaultValue={edit?.logo_url ?? ""}
              placeholder="https://.../logo.svg"
              className={`${adminControlClass} mt-1`}
            />
          </label>
          <label className="block text-sm font-bold">
            Görünme sırası
            <input
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={edit?.sort_order ?? items.length * 10 + 10}
              className={`${adminControlClass} mt-1`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              name="active"
              type="checkbox"
              defaultChecked={edit?.is_active ?? true}
            />
            Aktif
          </label>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </form>
      </AdminModal>
    </AdminCard>
  );
}
