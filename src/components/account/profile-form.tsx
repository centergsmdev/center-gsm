"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";

import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";

export function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await updateProfile({
      firstName: String(data.get("firstName")),
      lastName: String(data.get("lastName")),
      phone: String(data.get("phone")),
      email: String(data.get("email")),
      birthDate: String(data.get("birthDate")),
    });
    if (!result.success) {
      setError(result.error ?? "Profil güncellenemedi.");
      return;
    }
    setError("");
    setSaved(true);
  }
  return (
    <Card className="p-5 sm:p-7">
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckoutField
            label="Ad"
            name="firstName"
            defaultValue={user.firstName}
            required
          />
          <CheckoutField
            label="Soyad"
            name="lastName"
            defaultValue={user.lastName}
            required
          />
          <CheckoutField
            label="Telefon"
            name="phone"
            type="tel"
            defaultValue={user.phone}
            required
          />
          <CheckoutField
            label="E-posta"
            name="email"
            type="email"
            defaultValue={user.email}
            required
          />
          <CheckoutField
            label="Doğum tarihi"
            name="birthDate"
            type="date"
            defaultValue={user.birthDate}
            className="sm:col-span-2"
          />
        </div>
        {saved ? (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 text-xs font-bold text-success"
          >
            <Check className="size-4" />
            Profil bilgileriniz kaydedildi.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-xs font-bold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="mt-6">
          <Save className="size-4" />
          Bilgileri Kaydet
        </Button>
      </form>
    </Card>
  );
}
