import { ManagedContentPage } from "@/components/content/managed-content-page";
import { footerPages } from "@/lib/footer/content";
import { generateSeoMetadata } from "@/lib/seo/seo";
const content = footerPages.iletisim;
export const metadata = generateSeoMetadata({
  title: content.title,
  description: content.description,
  canonical: "/iletisim",
});
export default function Page() {
  return <ManagedContentPage slug="iletisim" />;
}
