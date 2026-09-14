import { WhatsAppRepresentativeLauncher } from "@/components/layout/whatsapp-representative-launcher";
import { getActiveWhatsAppRepresentatives } from "@/lib/contact/representatives";
import { buildWhatsAppHref } from "@/lib/contact/whatsapp";
import { getSiteSettings } from "@/lib/settings/site-settings";

export async function HomepageWhatsAppButton() {
  const [settings, representatives] = await Promise.all([
    getSiteSettings(),
    getActiveWhatsAppRepresentatives(),
  ]);
  return (
    <WhatsAppRepresentativeLauncher
      representatives={representatives}
      fallbackHref={buildWhatsAppHref(settings.phone)}
    />
  );
}
