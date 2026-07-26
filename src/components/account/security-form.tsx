"use client";
import { useState, type FormEvent } from "react";
import { Check, KeyRound, LogOut } from "lucide-react";
import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/lib/supabase/auth-api";
import { useAuth } from "@/providers/auth-provider";
export function SecurityForm() {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("currentPassword") ?? "");
    const password = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");
    setError("");
    setMessage("");
    if (password.length < 8 || password !== confirm) {
      setError("Yeni şifreler eşleşmeli ve en az 8 karakter olmalıdır.");
      return;
    }
    const client = createClient();
    if (!client) {
      setError("Supabase Auth yapılandırılmamış.");
      return;
    }
    setLoading(true);
    const verified = await authApi(client).signInWithPassword({
      email: user.email,
      password: current,
    });
    if (verified.error) {
      setLoading(false);
      setError("Mevcut şifre doğru değil.");
      return;
    }
    const result = await authApi(client).updateUser({ password });
    setLoading(false);
    if (result.error) {
      setError("Şifre güncellenemedi.");
      return;
    }
    form.reset();
    setMessage("Şifreniz başarıyla güncellendi.");
  };
  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-7">
        <h2 className="font-black">Şifre Değiştir</h2>
        <form onSubmit={submit} className="mt-5">
          <div className="space-y-4">
            <CheckoutField
              label="Mevcut şifre"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            <CheckoutField
              label="Yeni şifre"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            <CheckoutField
              label="Yeni şifre tekrar"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          {error ? (
            <p role="alert" className="mt-4 text-xs font-bold text-danger">
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 text-xs font-bold text-success"
            >
              <Check className="size-4" />
              {message}
            </p>
          ) : null}
          <Button type="submit" className="mt-5" disabled={loading}>
            <KeyRound className="size-4" />
            {loading ? "Güncelleniyor…" : "Şifreyi Güncelle"}
          </Button>
        </form>
      </Card>
      <Card className="p-5 sm:p-7">
        <h2 className="font-black">Aktif Oturum</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Bu cihazdaki güvenli oturumunuzu kapatabilirsiniz.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => void logout()}
        >
          <LogOut className="size-4" />
          Oturumu Kapat
        </Button>
      </Card>
    </div>
  );
}
