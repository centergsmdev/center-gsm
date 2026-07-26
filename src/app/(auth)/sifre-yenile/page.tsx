import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { ResetPasswordForm } from "@/components/account/reset-password-form";
export default function ResetPasswordPage() { return <AuthShell eyebrow="Güvenli hesap" title="Yeni şifrenizi belirleyin" description="Hesabınız için güçlü ve benzersiz bir şifre oluşturun." footer={<Link href="/giris" className="font-bold text-primary">Giriş ekranına dön</Link>}><ResetPasswordForm /></AuthShell>; }
