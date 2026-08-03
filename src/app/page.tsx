import { Benefits } from "@/components/home/benefits";
import { Brands } from "@/components/home/brands";
import { Categories } from "@/components/home/categories";
import { CategoryProductShowcase } from "@/components/home/category-product-showcase";
import { Deals } from "@/components/home/deals";
import { FeaturedProducts } from "@/components/home/featured-products";
import { WeeklyDeals } from "@/components/home/weekly-deals";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/home/hero";
import {
  BrandShowcase,
  HomepageFooterCta,
  PaymentAdvantages,
  WhyCenterGsm,
} from "@/components/home/homepage-trust-sections";
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
    weeklyDeals,
    phones,
    laptops,
    watches,
    tablets,
    shippingCarriers,
    paymentPartners,
  ] = await Promise.all([
    getFeaturedProducts(8),
    getProducts({ sort: "popular", pageSize: 8 }),
    getProducts({ weeklyDeal: true, sort: "popular", pageSize: 8 }),
    getProducts({ latestPhone: true, sort: "newest", pageSize: 8 }),
    getProducts({ categories: ["laptoplar"], sort: "newest", pageSize: 8 }),
    getProducts({
      categories: ["akilli-saat"],
      sort: "newest",
      pageSize: 8,
    }),
    getProducts({ categories: ["tablet"], sort: "newest", pageSize: 8 }),
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
            muted
          />
          <CategoryProductShowcase
            id="smart-watches"
            title="Akıllı Saatler"
            description="Günlük hayatınızı kolaylaştıran akıllı saat modelleri."
            actionLabel="Tüm Saatler"
            actionHref="/kategori/akilli-saat"
            products={watches.error ? [] : watches.data}
          />
          <CategoryProductShowcase
            id="tablet-world"
            title="Tablet Dünyası"
            description="Eğitim, iş ve eğlence için tablet seçenekleri."
            actionLabel="Tüm Tabletler"
            actionHref="/kategori/tablet"
            products={tablets.error ? [] : tablets.data}
            muted
          />
          <Deals products={(featured.error ? [] : featured.data).slice(0, 5)} />
          <Brands />
          <Benefits />
          <TrustSection
            carriers={shippingCarriers}
            paymentPartners={paymentPartners}
          />
          <WhyCenterGsm />
          <PaymentAdvantages />
          <BrandShowcase />
          <HomepageFooterCta />
        </main>
        <FadeIn>
          <Footer />
        </FadeIn>
      </MotionProvider>
    </div>
  );
}
