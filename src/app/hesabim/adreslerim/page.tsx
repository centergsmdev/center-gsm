import { AccountPageHeader } from "@/components/account/account-page-header";
import { AddressManager } from "@/components/account/address-manager";
export default function AddressesPage() {
  return (
    <>
      <AccountPageHeader
        eyebrow="Teslimat tercihleri"
        title="Adreslerim"
        description="Teslimat adreslerinizi ekleyin, düzenleyin ve varsayılan adresinizi seçin."
      />
      <AddressManager />
    </>
  );
}
