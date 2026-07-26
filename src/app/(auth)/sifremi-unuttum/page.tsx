import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Hesap kurtarma"
      title="Şifrenizi sıfırlayın"
      description="Hesabınızla ilişkili e-posta adresini girin."
      footer={
        <Link href="/giris" className="font-bold text-primary">
          Giriş ekranına dön
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
