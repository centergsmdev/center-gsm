import { AccountPageHeader } from "@/components/account/account-page-header";
import { NotificationSettings } from "@/components/account/notification-settings";
import { WishlistAlertCenter } from "@/components/account/wishlist-alert-center";
export default function NotificationsPage() {
  return (
    <>
      <AccountPageHeader
        eyebrow="İletişim tercihleri"
        title="Bildirimler"
        description="Hangi kanallardan bilgilendirme almak istediğinizi belirleyin."
      />
      <NotificationSettings />
      <WishlistAlertCenter />
    </>
  );
}
