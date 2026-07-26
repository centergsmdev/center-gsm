import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/register-form";
export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="CENTER GSM ailesi"
      title="Hesabınızı oluşturun"
      description="Siparişlerinizi ve adreslerinizi güvenli hesabınızdan yönetin."
      footer={
        <>
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" className="font-bold text-primary">
            Giriş Yap
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
