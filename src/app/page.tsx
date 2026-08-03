import { Benefits } from "@/components/home/benefits";
import { Brands } from "@/components/home/brands";
import { Categories } from "@/components/home/categories";
import { Deals } from "@/components/home/deals";
import { FeaturedProducts } from "@/components/home/featured-products";
import { WeeklyDeals } from "@/components/home/weekly-deals";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { FadeIn, MotionProvider } from "@/components/motion/motion-system";
import { getFeaturedProducts, getProducts } from "@/lib/catalog/data";
import {
  JsonLd,
  createOrganizationSchema,
  createWebsiteSchema,
} from "@/lib/seo/schema";
import { getPublicPaymentPartners } from "@/payments/repository/public-payment-partner-repository";
import { getPublicShippingCarriers } from "@/shipping/repository/public-shipping-repository";
export const revalidate = 300;

export default async function HomePage() {
  const [featured, popular, weeklyDeals, shippingCarriers, paymentPartners] =
    await Promise.all([
      getFeaturedProducts(8),
      getProducts({ sort: "popular", pageSize: 8 }),
      getProducts({ discount: true, sort: "popular", pageSize: 8 }),
      getPublicShippingCarriers(),
      getPublicPaymentPartners(),
    ]);
  const featuredProducts = featured.data.length
    ? featured.data
    : popular.error
      ? []
      : popular.data;
  return (
    <div className="tech-atmosphere min-h-screen text-zinc-950">
      <JsonLd id="organization-schema" data={createOrganizationSchema()} />
      <JsonLd id="website-schema" data={createWebsiteSchema()} />
      <Header />
      <MotionProvider>
        <main>
          <Hero />
          <Categories />
          <FeaturedProducts products={featuredProducts} />
          <WeeklyDeals products={weeklyDeals.error ? [] : weeklyDeals.data} />
          <Deals products={(featured.error ? [] : featured.data).slice(0, 5)} />
          <Brands />
          <Benefits />
          <TrustSection
            carriers={shippingCarriers}
            paymentPartners={paymentPartners}
          />
        </main>
        <FadeIn>
          <Footer />
        </FadeIn>
      </MotionProvider>
    </div>
  );
}
