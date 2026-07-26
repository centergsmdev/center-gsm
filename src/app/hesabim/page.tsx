import { AccountDashboard } from "@/components/account/account-dashboard";
import { AccountPageHeader } from "@/components/account/account-page-header";
export default function AccountPage() {
  return (
    <>
      <AccountPageHeader
        eyebrow="Hesabım"
        title="Hesap Özeti"
        description="Siparişlerinize ve hesap ayarlarınıza hızlıca ulaşın."
      />
      <AccountDashboard />
    </>
  );
}
