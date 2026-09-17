import { Categories } from "@/components/home/categories";
import { CategoryProductShowcase } from "@/components/home/category-product-showcase";
import { FeaturedProducts } from "@/components/home/featured-products";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { HomepageWhatsAppButton } from "@/components/layout/homepage-whatsapp-button";
import { Hero } from "@/components/home/hero";
import { HomepageFooterCta } from "@/components/home/homepage-trust-sections";
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
  const [
    featured,
    popular,
    phones,
    laptops,
    shippingCarriers,
    paymentPartners,
  ] = await Promise.all([
    getFeaturedProducts(8),
    getProducts({ sort: "popular", pageSize: 8 }),
    getProducts({ latestPhone: true, sort: "newest", pageSize: 6 }),
    getProducts({ categories: ["laptoplar"], sort: "newest", pageSize: 6 }),
    getPublicShippingCarriers(),
    getPublicPaymentPartners(),
  ]);
  const featuredProducts = featured.data.length
    ? featured.data
    : popular.error
      ? []
      : popular.data;
  const heroProduct =
    featuredProducts.find((product) => product.showInstallments) ??
    featuredProducts[0];
  return (
    <div className="tech-atmosphere min-h-screen text-zinc-950">
      <JsonLd id="organization-schema" data={createOrganizationSchema()} />
      <JsonLd id="website-schema" data={createWebsiteSchema()} />
      <Header />
      <MotionProvider>
        <main>
          <Hero product={heroProduct} />
          <Categories />
          <FeaturedProducts products={featuredProducts} />
          <CategoryProductShowcase
            id="latest-phones"
            title="En Yeni Telefonlar"
            description="Apple, Samsung, Xiaomi ve diğer telefon modellerini keşfedin."
            actionLabel="Tüm Telefonlar"
            actionHref="/kategori/telefon"
            products={phones.error ? [] : phones.data}
          />
          <CategoryProductShowcase
            id="laptop-world"
            title="Laptop Dünyası"
            description="İş, oyun ve günlük kullanım için seçilmiş laptoplar."
            actionLabel="Tüm Laptoplar"
            actionHref="/kategori/laptoplar"
            products={laptops.error ? [] : laptops.data}
          />
          <TrustSection
            carriers={shippingCarriers}
            paymentPartners={paymentPartners}
          />
          <HomepageFooterCta />
        </main>
        <FadeIn>
          <Footer />
        </FadeIn>
      </MotionProvider>
      <HomepageWhatsAppButton />
    </div>
  );
}
