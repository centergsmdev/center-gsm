"use client";

import { useState } from "react";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";

import { AccountEmptyState } from "@/components/account/account-empty-state";
import {
  CheckoutField,
  CheckoutTextarea,
} from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/providers/auth-provider";
import type { DemoAddress } from "@/types/account";

export function AddressManager() {
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAuth();
  const [editing, setEditing] = useState<DemoAddress | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      title: String(data.get("title")),
      recipient: String(data.get("recipient")),
      phone: String(data.get("phone")),
      address: String(data.get("address")),
      city: String(data.get("city")),
      district: String(data.get("district")),
      neighborhood: String(data.get("neighborhood")),
      postalCode: String(data.get("postalCode")),
    };
    setBusy(true);
    setError("");
    const result =
      editing === "new"
        ? await addAddress(values)
        : editing
          ? await updateAddress({ ...editing, ...values })
          : { success: false, error: "Adres bilgisi bulunamadı." };
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Adres kaydedilemedi.");
      return;
    }
    setEditing(null);
  }
  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" />
          Adres Ekle
        </Button>
      </div>
      {addresses.length === 0 ? (
        <AccountEmptyState
          title="Kayıtlı adresiniz yok"
          description="Teslimat işlemlerini hızlandırmak için yeni bir adres ekleyebilirsiniz."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`relative p-5 ${address.isDefault ? "border-zinc-950 ring-1 ring-zinc-950" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-surface-subtle">
                  <MapPin className="size-5" />
                </span>
                <div className="flex gap-1">
                  <IconButton
                    label={`${address.title} adresini düzenle`}
                    size="sm"
                    onClick={() => setEditing(address)}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`${address.title} adresini sil`}
                    size="sm"
                    onClick={() => {
                      setError("");
                      void deleteAddress(address.id).then((result) => {
                        if (!result.success)
                          setError(result.error ?? "Adres silinemedi.");
                      });
                    }}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </IconButton>
                </div>
              </div>
              <h2 className="mt-4 font-black">{address.title}</h2>
              {address.isDefault ? (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                  <Check className="size-3" />
                  Varsayılan
                </span>
              ) : null}
              <p className="mt-3 text-xs font-semibold">
                {address.recipient} · {address.phone}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                {address.address}
              </p>
              {!address.isDefault ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setError("");
                    void setDefaultAddress(address.id).then((result) => {
                      if (!result.success)
                        setError(
                          result.error ?? "Varsayılan adres değiştirilemedi.",
                        );
                    });
                  }}
                >
                  Varsayılan Yap
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      {error && !editing ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      ) : null}
      {editing ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <form
            onSubmit={submit}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-dialog-title"
          >
            <div className="flex items-center justify-between">
              <h2 id="address-dialog-title" className="text-xl font-black">
                {editing === "new" ? "Yeni Adres" : "Adresi Düzenle"}
              </h2>
              <IconButton
                label="Pencereyi kapat"
                size="sm"
                onClick={() => setEditing(null)}
              >
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <CheckoutField
                label="Adres başlığı"
                name="title"
                required
                defaultValue={editing === "new" ? "" : editing.title}
              />
              <CheckoutField
                label="Alıcı"
                name="recipient"
                required
                defaultValue={editing === "new" ? "" : editing.recipient}
              />
              <CheckoutField
                label="Telefon"
                name="phone"
                type="tel"
                required
                defaultValue={editing === "new" ? "" : editing.phone}
                className="sm:col-span-2"
              />
              <CheckoutTextarea
                label="Açık adres"
                name="address"
                required
                defaultValue={editing === "new" ? "" : editing.address}
                className="sm:col-span-2"
              />
              <CheckoutField
                label="İl"
                name="city"
                required
                defaultValue={editing === "new" ? "" : editing.city}
              />
              <CheckoutField
                label="İlçe"
                name="district"
                required
                defaultValue={editing === "new" ? "" : editing.district}
              />
              <CheckoutField
                label="Mahalle"
                name="neighborhood"
                defaultValue={editing === "new" ? "" : editing.neighborhood}
              />
              <CheckoutField
                label="Posta kodu"
                name="postalCode"
                defaultValue={editing === "new" ? "" : editing.postalCode}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {error ? (
                <p
                  role="alert"
                  className="mr-auto self-center text-xs font-semibold text-red-700"
                >
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Vazgeç
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
