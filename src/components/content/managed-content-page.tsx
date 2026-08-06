import { ContentPage } from "@/components/content/content-page";
import {
  getManagedFooterPage,
  type FooterPageSlug,
} from "@/lib/footer/managed-content";

export async function ManagedContentPage({ slug }: { slug: FooterPageSlug }) {
  const content = await getManagedFooterPage(slug);
  return <ContentPage {...content} />;
}
