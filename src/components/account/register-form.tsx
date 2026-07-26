"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserPlus } from "lucide-react";

import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");
    const next: Record<string, string> = {};
    if (!firstName) next.firstName = "Adınızı girin.";
    if (!lastName) next.lastName = "Soyadınızı girin.";
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Geçerli bir e-posta girin.";
    if (phone.replace(/\D/g, "").length < 10)
      next.phone = "Geçerli bir telefon numarası girin.";
    if (password.length < 8)
      next.password = "Şifre en az 8 karakter olmalıdır.";
    if (password !== confirm) next.confirmPassword = "Şifreler eşleşmiyor.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    const result = await register(firstName, lastName, phone, email, password);
    if (!result.success) {
      setLoading(false);
      setErrors({ form: result.error ?? "Kayıt oluşturulamadı." });
      return;
    }
    router.push(
      result.requiresEmailConfirmation ? "/giris?kayit=onay" : "/hesabim",
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckoutField
          label="Telefon"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          error={errors.phone}
          className="sm:col-span-2"
        />
        <CheckoutField
          label="Ad"
          name="firstName"
          autoComplete="given-name"
          required
          error={errors.firstName}
        />
        <CheckoutField
          label="Soyad"
          name="lastName"
          autoComplete="family-name"
          required
          error={errors.lastName}
        />
        <CheckoutField
          label="E-posta"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={errors.email}
          className="sm:col-span-2"
        />
        <CheckoutField
          label="Şifre"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.password}
          className="sm:col-span-2"
        />
        <CheckoutField
          label="Şifre tekrar"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
          className="sm:col-span-2"
        />
      </div>
      {errors.form ? (
        <p
          className="mt-4 rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700"
          role="alert"
        >
          {errors.form}
        </p>
      ) : null}
      <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-muted">
        <input
          type="checkbox"
          required
          className="mt-1 size-4 accent-red-700"
        />
        Üyelik koşullarını ve gizlilik bilgilendirmesini okudum.
      </label>
      <Button
        type="submit"
        size="lg"
        className="mt-5 w-full"
        disabled={loading}
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        {loading ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}
      </Button>
    </form>
  );
}
