"use client";
import { useState, type FormEvent } from "react";
import { Check, Mail } from "lucide-react";
import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/lib/supabase/auth-api";
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    const client = createClient();
    if (!client) {
      setError("Supabase Auth yapılandırılmamış.");
      setLoading(false);
      return;
    }
    const result = await authApi(client).resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-yenile`,
    });
    setLoading(false);
    if (result.error) {
      setError("Sıfırlama bağlantısı gönderilemedi.");
      return;
    }
    setSent(true);
  };
  if (sent)
    return (
      <div className="rounded-lg bg-emerald-50 p-6 text-center">
        <Check className="mx-auto size-7 text-emerald-700" />
        <h2 className="mt-3 font-black">Bağlantı gönderildi</h2>
        <p className="mt-2 text-sm text-emerald-800">
          E-posta adresiniz kayıtlıysa şifre yenileme bağlantısı gönderildi.
        </p>
      </div>
    );
  return (
    <form onSubmit={submit}>
      <CheckoutField
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="ornek@eposta.com"
      />
      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="mt-5 w-full"
        disabled={loading}
      >
        <Mail className="size-4" />
        {loading ? "Gönderiliyor…" : "Sıfırlama Bağlantısı Gönder"}
      </Button>
    </form>
  );
}
