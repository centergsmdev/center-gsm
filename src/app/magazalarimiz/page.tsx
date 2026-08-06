import { ManagedContentPage } from "@/components/content/managed-content-page";
import { footerPages } from "@/lib/footer/content";
import { generateSeoMetadata } from "@/lib/seo/seo";
const content = footerPages.magazalarimiz;
export const metadata = generateSeoMetadata({
  title: content.title,
  description: content.description,
  canonical: "/magazalarimiz",
});
export default function Page() {
  return <ManagedContentPage slug="magazalarimiz" />;
}
