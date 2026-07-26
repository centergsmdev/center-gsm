import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountReturns } from "@/components/returns/account-returns";
export default function Page() {
  return (
    <>
      <AccountPageHeader
        eyebrow="Satış sonrası"
        title="İade ve Değişim Taleplerim"
        description="Taleplerinizi ve güncel durumlarını takip edin."
      />
      <AccountReturns />
    </>
  );
}
