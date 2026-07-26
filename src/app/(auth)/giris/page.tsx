import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/login-form";
export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Tekrar hoş geldiniz"
      title="Hesabınıza giriş yapın"
      description="Siparişlerinizi, adreslerinizi ve favorilerinizi tek yerden yönetin."
      footer={
        <>
          Hesabınız yok mu?{" "}
          <Link href="/kayit" className="font-bold text-primary">
            Kayıt Ol
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
