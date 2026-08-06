import { ManagedContentPage } from "@/components/content/managed-content-page";
import { footerPages } from "@/lib/footer/content";
import { generateSeoMetadata } from "@/lib/seo/seo";
const content = footerPages["iade-ve-degisim"];
export const metadata = generateSeoMetadata({
  title: content.title,
  description: content.description,
  canonical: "/iade-ve-degisim",
});
export default function Page() {
  return <ManagedContentPage slug="iade-ve-degisim" />;
}
