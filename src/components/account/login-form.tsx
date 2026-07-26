"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";

import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      router.push("/hesabim");
      router.refresh();
    } else {
      setLoading(false);
      setError(result.error ?? "Giriş yapılamadı.");
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4">
        <CheckoutField
          label="E-posta"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <div className="relative">
          <CheckoutField
            label="Şifre"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-[34px] grid size-8 place-items-center rounded-full text-muted hover:bg-surface-muted"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>
      <div className="mt-3 text-right">
        <Link
          href="/sifremi-unuttum"
          className="text-xs font-bold text-primary hover:text-primary-hover"
        >
          Şifremi Unuttum
        </Link>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-red-50 p-3 text-xs font-semibold text-danger"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="mt-5 w-full"
        disabled={loading}
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
      </Button>
    </form>
  );
}
