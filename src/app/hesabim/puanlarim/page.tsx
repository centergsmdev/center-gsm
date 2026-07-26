import { AccountPageHeader } from "@/components/account/account-page-header";
import { LoyaltyDashboard } from "@/components/account/loyalty-dashboard";
export default function Page() {
  return (
    <>
      <AccountPageHeader
        eyebrow="CENTER Rewards"
        title="Puanlarım"
        description="Kazandığınız ve kullandığınız puanları takip edin."
      />
      <LoyaltyDashboard />
    </>
  );
}
