import { AccountPageHeader } from "@/components/account/account-page-header";
import { ReturnDetail } from "@/components/returns/return-detail";
export default function Page() {
  return (
    <>
      <AccountPageHeader
        eyebrow="RMA"
        title="Talep Detayı"
        description="Mesajları ve durum geçmişini takip edin."
      />
      <ReturnDetail />
    </>
  );
}
