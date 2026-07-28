import { ContentPage } from "@/components/content/content-page";
import { footerPages } from "@/lib/footer/content";
import { generateSeoMetadata } from "@/lib/seo/seo";
const content = footerPages.kariyer;
export const metadata = generateSeoMetadata({
  title: content.title,
  description: content.description,
  canonical: "/kariyer",
});
export default function Page() {
  return <ContentPage {...content} />;
}
