"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { AdminModal } from "./admin-modal-lazy";
import { Button } from "@/components/ui/button";
import { adminControlClass } from "./admin-form";
import {
  createAdminShippingCarrier,
  deactivateAdminShippingCarrier,
  getAdminShippingCarriers,
  setDefaultShippingCarrier,
  updateAdminShippingCarrier,
} from "@/shipping/repository/shipping-repository";
import type { Tables } from "@/types/database";
export function AdminShippingCarriers() {
  const [items, setItems] = useState<Tables<"shipping_carriers">[]>([]),
    [edit, setEdit] = useState<Tables<"shipping_carriers"> | null | undefined>(
      undefined,
    ),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const r = await getAdminShippingCarriers();
    if (r.data) {
      setItems(r.data);
      setError("");
    } else setError(r.error ?? "");
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      values = {
        name: String(f.get("name")).trim(),
        code: String(f.get("code")).trim().toUpperCase(),
        provider_key: String(f.get("provider")).trim().toLowerCase(),
        tracking_url_template: String(f.get("url")).trim() || null,
        logo_url: String(f.get("logo")).trim() || null,
        support_phone: String(f.get("phone")).trim() || null,
        description: String(f.get("description")).trim() || null,
        is_active: f.get("active") === "on",
        supports_api: f.get("api") === "on",
      };
    if (!values.name || !values.code || !values.provider_key) {
      setError("Ad, kod ve sağlayıcı anahtarı zorunludur.");
      return;
    }
    const r = edit
      ? await updateAdminShippingCarrier(edit.id, values)
      : await createAdminShippingCarrier(values);
    if (!r.data) {
      setError(r.error ?? "");
      return;
    }
    setEdit(undefined);
    setNotice("Kargo firması kaydedildi.");
    await load();
  }
  const filtered = items.filter((x) =>
    `${x.name} ${x.code}`
      .toLocaleLowerCase("tr-TR")
      .includes(query.toLocaleLowerCase("tr-TR")),
  );
  return (
    <AdminCard>
      <AdminCardHeader
        title="Kargo firmaları"
        description="Manuel ve gelecekteki API sağlayıcılarını yönetin"
        action={
          <Button type="button" onClick={() => setEdit(null)}>
            Firma ekle
          </Button>
        }
      />
      <div className="border-b p-4">
        <input
          aria-label="Kargo firması ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Firma veya kod ara…"
          className={adminControlClass}
        />
      </div>
      {notice ? (
        <p
          role="status"
          className="m-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
        >
          {notice}
        </p>
      ) : null}
      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <AdminErrorState retry={() => void load()} />
      ) : filtered.length ? (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {filtered.map((x) => (
            <article key={x.id} className="rounded-xl border p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-black">{x.name}</p>
                  <p className="text-xs text-zinc-500">
                    {x.code} · {x.provider_key}
                  </p>
                </div>
                <span className="text-xs font-bold">
                  {x.is_default
                    ? "Varsayılan"
                    : x.is_active
                      ? "Aktif"
                      : "Pasif"}
                </span>
              </div>
              <p className="mt-3 text-sm text-zinc-600">
                {x.description ?? "Açıklama yok"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEdit(x)}
                >
                  Düzenle
                </Button>
                {!x.is_default && x.is_active ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await setDefaultShippingCarrier(x.id);
                      await load();
                    }}
                  >
                    Varsayılan yap
                  </Button>
                ) : null}
                {x.is_active && !x.is_default ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      await deactivateAdminShippingCarrier(x.id);
                      await load();
                    }}
                  >
                    Pasifleştir
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <AdminEmptyState
          title="Kargo firması bulunamadı"
          description="İlk manuel kargo firmanızı ekleyin."
        />
      )}
      <AdminModal
        open={edit !== undefined}
        onClose={() => setEdit(undefined)}
        title={edit ? "Kargo firmasını düzenle" : "Kargo firması ekle"}
      >
        <form onSubmit={save} className="space-y-3">
          {(
            [
              ["Firma adı", "name", edit?.name],
              ["Kod", "code", edit?.code],
              ["Provider anahtarı", "provider", edit?.provider_key],
              ["Takip URL şablonu", "url", edit?.tracking_url_template],
              ["Logo URL", "logo", edit?.logo_url],
              ["Destek telefonu", "phone", edit?.support_phone],
            ] satisfies [string, string, string | null | undefined][]
          ).map(([l, n, v]) => (
            <label key={n} className="block text-sm font-bold">
              {l}
              <input
                name={n}
                defaultValue={v ?? ""}
                className={`${adminControlClass} mt-1`}
              />
            </label>
          ))}
          <label className="block text-sm font-bold">
            Açıklama
            <textarea
              name="description"
              defaultValue={edit?.description ?? ""}
              className={`${adminControlClass} mt-1 h-20`}
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={edit?.is_active ?? true}
            />
            Aktif
          </label>
          <label className="flex gap-2 text-sm">
            <input
              name="api"
              type="checkbox"
              defaultChecked={edit?.supports_api ?? false}
            />
            API destekli
          </label>
          <Button type="submit" className="w-full">
            Kaydet
          </Button>
        </form>
      </AdminModal>
    </AdminCard>
  );
}
