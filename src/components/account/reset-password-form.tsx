"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/lib/supabase/auth-api";
export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password.length < 8 || password !== confirm) {
      setError("Şifreler eşleşmeli ve en az 8 karakter olmalıdır.");
      return;
    }
    const client = createClient();
    if (!client) {
      setError("Supabase Auth yapılandırılmamış.");
      return;
    }
    setLoading(true);
    const result = await authApi(client).updateUser({ password });
    setLoading(false);
    if (result.error) {
      setError("Şifre yenilenemedi. Bağlantının süresi dolmuş olabilir.");
      return;
    }
    router.replace("/giris?sifre=yenilendi");
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <CheckoutField
        label="Yeni şifre"
        name="password"
        type="password"
        autoComplete="new-password"
        required
      />
      <CheckoutField
        label="Yeni şifre tekrar"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
      />
      {error ? (
        <p className="text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        <KeyRound className="size-4" />
        {loading ? "Yenileniyor…" : "Şifreyi Yenile"}
      </Button>
    </form>
  );
}
