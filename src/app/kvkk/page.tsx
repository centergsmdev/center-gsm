import { ContentPage } from "@/components/content/content-page";
import { footerPages } from "@/lib/footer/content";
import { generateSeoMetadata } from "@/lib/seo/seo";
const content = footerPages.kvkk;
export const metadata = generateSeoMetadata({
  title: content.title,
  description: content.description,
  canonical: "/kvkk",
});
export default function Page() {
  return <ContentPage {...content} />;
}
