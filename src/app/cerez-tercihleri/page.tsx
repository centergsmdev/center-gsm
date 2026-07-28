import { ContentPage } from "@/components/content/content-page";
import { footerPages } from "@/lib/footer/content";
import { generateSeoMetadata } from "@/lib/seo/seo";
const content = footerPages["cerez-tercihleri"];
export const metadata = generateSeoMetadata({
  title: content.title,
  description: content.description,
  canonical: "/cerez-tercihleri",
});
export default function Page() {
  return <ContentPage {...content} />;
}
