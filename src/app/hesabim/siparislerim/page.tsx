import { AccountOrders } from "@/components/account/account-orders";
import { AccountPageHeader } from "@/components/account/account-page-header";
export default function AccountOrdersPage() {
  return (
    <>
      <AccountPageHeader
        eyebrow="Alışveriş geçmişi"
        title="Siparişlerim"
        description="Sipariş durumlarını ve detaylarını görüntüleyin."
      />
      <AccountOrders />
    </>
  );
}
