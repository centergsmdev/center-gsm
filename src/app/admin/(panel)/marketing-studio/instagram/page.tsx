import { InstagramPreviewStudio } from "@/components/admin/marketing-studio/instagram-preview-studio";
import { SEO_CONFIG } from "@/lib/seo/constants";

export default async function InstagramStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string | string[] }>;
}) {
  const params = await searchParams;
  const productId = Array.isArray(params.productId)
    ? params.productId[0]
    : params.productId;

  return (
    <InstagramPreviewStudio
      productId={productId}
      siteUrl={SEO_CONFIG.siteUrl}
    />
  );
}
