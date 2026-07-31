import { Benefits } from "@/components/home/benefits";
import { Brands } from "@/components/home/brands";
import { Categories } from "@/components/home/categories";
import { Deals } from "@/components/home/deals";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { FadeIn, MotionProvider } from "@/components/motion/motion-system";
import { getFeaturedProducts } from "@/lib/catalog/data";
import {
  JsonLd,
  createOrganizationSchema,
  createWebsiteSchema,
} from "@/lib/seo/schema";
import { getPublicPaymentPartners } from "@/payments/repository/public-payment-partner-repository";
import { getPublicShippingCarriers } from "@/shipping/repository/public-shipping-repository";
export const revalidate = 300;

export default async function HomePage() {
  const [featured, shippingCarriers, paymentPartners] = await Promise.all([
    getFeaturedProducts(5),
    getPublicShippingCarriers(),
    getPublicPaymentPartners(),
  ]);
  return (
    <div className="tech-atmosphere min-h-screen text-zinc-950">
      <JsonLd id="organization-schema" data={createOrganizationSchema()} />
      <JsonLd id="website-schema" data={createWebsiteSchema()} />
      <Header />
      <MotionProvider>
        <main>
          <Hero />
          <Categories />
          <Deals products={featured.error ? [] : featured.data} />
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
