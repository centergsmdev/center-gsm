"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  UserPlus,
} from "lucide-react";

import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export function RegisterForm() {
  const router = useRouter();
  const { register, resendRegistrationCode, verifyRegistrationCode } =
    useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const pendingEmail = window.sessionStorage.getItem(
      "center-gsm-pending-registration-email",
    );
    if (pendingEmail) setVerificationEmail(pendingEmail);
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

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
    if (result.requiresEmailConfirmation) {
      window.sessionStorage.setItem(
        "center-gsm-pending-registration-email",
        email,
      );
      setVerificationEmail(email);
      setResendSeconds(60);
      setLoading(false);
      setErrors({});
      return;
    }
    router.push("/hesabim");
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.replace(/\D/g, "");
    if (normalizedCode.length !== 6) {
      setErrors({ code: "E-postanıza gelen 6 haneli kodu girin." });
      return;
    }
    setLoading(true);
    setErrors({});
    setNotice("");
    const result = await verifyRegistrationCode(
      verificationEmail,
      normalizedCode,
    );
    if (!result.success) {
      setLoading(false);
      setErrors({ code: result.error ?? "Kod doğrulanamadı." });
      return;
    }
    window.sessionStorage.removeItem(
      "center-gsm-pending-registration-email",
    );
    router.push("/hesabim");
    router.refresh();
  }

  async function resend() {
    if (resendLoading || resendSeconds > 0) return;
    setResendLoading(true);
    setErrors({});
    setNotice("");
    const result = await resendRegistrationCode(verificationEmail);
    setResendLoading(false);
    if (!result.success) {
      setErrors({ code: result.error ?? "Yeni kod gönderilemedi." });
      return;
    }
    setCode("");
    setResendSeconds(60);
    setNotice("Yeni doğrulama kodu e-posta adresinize gönderildi.");
  }

  if (verificationEmail) {
    return (
      <form onSubmit={verify} noValidate>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-black text-zinc-950">
            E-postanızı doğrulayın
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            <strong className="text-zinc-900">{verificationEmail}</strong>
            <br />
            adresine gönderilen 6 haneli kodu girin.
          </p>
        </div>

        <CheckoutField
          label="Doğrulama kodu"
          name="verificationCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          required
          autoFocus
          error={errors.code}
          className="mt-5"
          placeholder="000000"
        />

        {notice ? (
          <p
            className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"
            role="status"
          >
            {notice}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-5 w-full"
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <MailCheck className="size-4" />
          )}
          {loading ? "Kod doğrulanıyor…" : "Kodu Doğrula ve Üyeliği Tamamla"}
        </Button>

        <div className="mt-4 flex flex-col items-center gap-3 text-xs sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => {
              window.sessionStorage.removeItem(
                "center-gsm-pending-registration-email",
              );
              setVerificationEmail("");
              setCode("");
              setErrors({});
              setNotice("");
            }}
            className="inline-flex items-center gap-1.5 font-bold text-zinc-600 hover:text-zinc-950"
          >
            <ArrowLeft className="size-3.5" />
            Bilgileri değiştir
          </button>
          <button
            type="button"
            onClick={() => void resend()}
            disabled={resendLoading || resendSeconds > 0}
            className="inline-flex items-center gap-1.5 font-bold text-primary disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            <RefreshCw
              className={`size-3.5 ${resendLoading ? "animate-spin" : ""}`}
            />
            {resendSeconds > 0
              ? `Yeni kod için ${resendSeconds} sn`
              : "Kodu tekrar gönder"}
          </button>
        </div>
      </form>
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
