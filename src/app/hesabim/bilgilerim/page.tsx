import { AccountPageHeader } from "@/components/account/account-page-header";
import { ProfileForm } from "@/components/account/profile-form";
export default function ProfilePage() {
  return (
    <>
      <AccountPageHeader
        eyebrow="Profil ayarları"
        title="Kişisel Bilgilerim"
        description="İletişim ve profil bilgilerinizi güvenle güncelleyin."
      />
      <ProfileForm />
    </>
  );
}
