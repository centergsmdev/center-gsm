import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/login-form";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedReturnUrl =
    typeof params.returnUrl === "string" ? params.returnUrl : "/hesabim";
  const returnUrl =
    requestedReturnUrl.startsWith("/") && !requestedReturnUrl.startsWith("//")
      ? requestedReturnUrl
      : "/hesabim";
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
      <LoginForm
        registrationPending={params.kayit === "onay"}
        callbackError={Boolean(params.hata)}
        returnUrl={returnUrl}
      />
    </AuthShell>
  );
}
