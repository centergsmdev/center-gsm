"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, Search, Star, Trash2, Warehouse } from "lucide-react";
import { AdminBadge } from "./admin-badge";
import { AdminCard, AdminCardHeader } from "./admin-card";
import { adminControlClass } from "./admin-form";
import { AdminModal } from "./admin-modal-lazy";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import { Button } from "@/components/ui/button";
import {
  createAdminWarehouse,
  deactivateAdminWarehouse,
  getAdminWarehouses,
  setDefaultWarehouse,
  updateAdminWarehouse,
} from "@/lib/admin/inventory";
import type { Tables } from "@/types/database";
import type { WarehouseValues } from "@/types/inventory";
export function AdminWarehouses() {
  const [items, setItems] = useState<Tables<"warehouses">[]>([]),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editor, setEditor] = useState<Tables<"warehouses"> | "new" | null>(null),
    [pending, setPending] = useState<Tables<"warehouses"> | null>(null),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const r = await getAdminWarehouses();
    if (r.data) {
      setItems(r.data);
      setError("");
    } else setError(r.error);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = items.filter((x) =>
    `${x.name} ${x.code}`
      .toLocaleLowerCase("tr-TR")
      .includes(query.toLocaleLowerCase("tr-TR")),
  );
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      v: WarehouseValues = {
        name: String(f.get("name")).trim(),
        code: String(f.get("code")).trim().toUpperCase(),
        description: String(f.get("description")).trim() || null,
        address: String(f.get("address")).trim() || null,
        is_active: f.get("active") === "on",
        is_default: f.get("default") === "on",
      };
    if (!v.name || !v.code) {
      setError("Depo adı ve kodu zorunludur.");
      return;
    }
    setSaving(true);
    const r =
      editor !== "new" && editor
        ? await updateAdminWarehouse(editor.id, v)
        : await createAdminWarehouse(v);
    setSaving(false);
    if (!r.data) {
      setError(r.error);
      return;
    }
    setEditor(null);
    setNotice("Depo kaydedildi.");
    await load();
  };
  const deactivate = async () => {
    if (!pending) return;
    setSaving(true);
    const r = await deactivateAdminWarehouse(pending.id);
    setSaving(false);
    setPending(null);
    if (!r.data) setError(r.error);
    else {
      setNotice("Depo pasif duruma alındı.");
      await load();
    }
  };
  const makeDefault = async (id: string) => {
    const r = await setDefaultWarehouse(id);
    if (!r.data) setError(r.error);
    else await load();
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
          title="Depolar"
          description={`${items.length} depo · Çoklu depo altyapısı`}
          action={
            <Button size="sm" onClick={() => setEditor("new")}>
              <Plus className="size-4" />
              Yeni depo
            </Button>
          }
        />
        <label className="m-4 flex h-11 max-w-md items-center gap-2 rounded-xl border px-3">
          <Search className="size-4 text-zinc-400" />
          <span className="sr-only">Depo ara</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Depo ara…"
            className="w-full text-sm outline-none"
          />
        </label>
        {loading ? (
          <AdminLoadingState />
        ) : error && !items.length ? (
          <AdminErrorState retry={() => void load()} />
        ) : visible.length ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((x) => (
              <article key={x.id} className="rounded-2xl border p-5">
                <div className="flex justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-zinc-950 text-white">
                    <Warehouse className="size-5" />
                  </span>
                  <div className="flex gap-2">
                    <AdminBadge variant={x.is_active ? "success" : "neutral"}>
                      {x.is_active ? "Aktif" : "Pasif"}
                    </AdminBadge>
                    {x.is_default ? (
                      <AdminBadge variant="info">Varsayılan</AdminBadge>
                    ) : null}
                  </div>
                </div>
                <h2 className="mt-4 font-black">{x.name}</h2>
                <p className="font-mono text-xs text-zinc-500">{x.code}</p>
                <p className="mt-3 text-sm text-zinc-600">
                  {x.address || x.description || "Adres belirtilmedi"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                  {x.is_active && !x.is_default ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void makeDefault(x.id)}
                    >
                      <Star className="size-4" />
                      Varsayılan
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditor(x)}
                  >
                    <Edit3 className="size-4" />
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPending(x)}
                  >
                    <Trash2 className="size-4" />
                    Pasif
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Depo bulunamadı"
            description="Aramayı değiştirin veya yeni depo ekleyin."
          />
        )}
      </AdminCard>
      <AdminModal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={editor === "new" ? "Yeni depo" : "Depoyu düzenle"}
      >
        {editor ? (
          <WarehouseForm
            item={editor === "new" ? null : editor}
            saving={saving}
            submit={save}
          />
        ) : null}
      </AdminModal>
      <AdminModal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Depo pasif yapılsın mı?"
        description="Stok bulunan depolar pasif yapılamaz."
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
function WarehouseForm({
  item,
  saving,
  submit,
}: {
  item: Tables<"warehouses"> | null;
  saving: boolean;
  submit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={submit} className="space-y-4">
      {[
        ["Depo adı", "name", item?.name ?? ""],
        ["Kod", "code", item?.code ?? ""],
        ["Açıklama", "description", item?.description ?? ""],
        ["Adres", "address", item?.address ?? ""],
      ].map(([label, name, value]) => (
        <label key={name} className="block">
          <span className="mb-2 block text-sm font-bold">{label}</span>
          <input
            name={name}
            defaultValue={value}
            required={name === "name" || name === "code"}
            className={adminControlClass}
          />
        </label>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle name="active" label="Aktif" checked={item?.is_active ?? true} />
        <Toggle
          name="default"
          label="Varsayılan"
          checked={item?.is_default ?? false}
        />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
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
    <label className="flex justify-between rounded-xl bg-zinc-50 p-3 text-sm font-bold">
      {label}
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="size-5 accent-red-600"
      />
    </label>
  );
}
