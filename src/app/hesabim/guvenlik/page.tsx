import { AccountPageHeader } from "@/components/account/account-page-header";
import { SecurityForm } from "@/components/account/security-form";
export default function SecurityPage() {
  return (
    <>
      <AccountPageHeader
        eyebrow="Hesap koruması"
        title="Şifre ve Güvenlik"
        description="Şifre değişikliği ve oturum yönetimi seçenekleri."
      />
      <SecurityForm />
    </>
  );
}
