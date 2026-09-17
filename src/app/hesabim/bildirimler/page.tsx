import { AccountPageHeader } from "@/components/account/account-page-header";
import { WishlistAlertCenter } from "@/components/account/wishlist-alert-center";
export default function NotificationsPage() {
  return (
    <>
      <AccountPageHeader
        eyebrow="Favoriler"
        title="Favori Ürün Alarmları"
        description="Takip ettiğiniz ürünlerin fiyat ve stok alarmlarını yönetin."
      />
      <WishlistAlertCenter />
    </>
  );
}
