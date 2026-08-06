import { ManagedContentPage } from "@/components/content/managed-content-page";
import { footerPages } from "@/lib/footer/content";
import { generateSeoMetadata } from "@/lib/seo/seo";
const content = footerPages.garanti;
export const metadata = generateSeoMetadata({
  title: content.title,
  description: content.description,
  canonical: "/garanti",
});
export default function Page() {
  return <ManagedContentPage slug="garanti" />;
}
