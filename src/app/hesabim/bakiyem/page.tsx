import { AccountPageHeader } from "@/components/account/account-page-header";
import { CreditDashboard } from "@/components/account/credit-dashboard";
export default function Page() {
  return (
    <>
      <AccountPageHeader
        eyebrow="CENTER Wallet"
        title="Bakiyem"
        description="Hediye kartı ve mağaza bakiyesi hareketlerinizi takip edin."
      />
      <CreditDashboard />
    </>
  );
}
