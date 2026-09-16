import { TradeInApplication } from "@/components/trade-in/trade-in-application";
import { generateSeoMetadata } from "@/lib/seo/seo";

export const metadata = generateSeoMetadata({
  title: "Telefonunu Takasa Ver",
  description:
    "Eski telefonunuz için güvenli ön değerlendirme başvurusu oluşturun, CENTER GSM takas teklifinizi iletsin.",
  canonical: "/telefonunu-takasa-ver",
});

export default async function TradeInPage({
  searchParams,
}: {
  searchParams: Promise<{ desiredProduct?: string }>;
}) {
  const params = await searchParams;
  return (
    <TradeInApplication
      initialDesiredProduct={params.desiredProduct?.slice(0, 160) ?? ""}
    />
  );
}
