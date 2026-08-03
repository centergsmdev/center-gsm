import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  Building2,
  CreditCard,
  HeadphonesIcon,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import {
  AnimatedCard,
  RevealSection,
  StaggerContainer,
} from "@/components/motion/motion-system";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { getBrands } from "@/lib/catalog/data";

const confidenceItems: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "%100 Orijinal Ürün",
    description: "Güvenilir tedarik kanallarından seçilmiş teknoloji ürünleri.",
    icon: BadgeCheck,
  },
  {
    title: "Yetkili Garantili Ürünler",
    description:
      "Garanti kapsamı açıkça belirtilen güvenli alışveriş deneyimi.",
    icon: PackageCheck,
  },
  {
    title: "Güvenli Ödeme",
    description: "Ödeme bilgileriniz korunan altyapı üzerinden işlenir.",
    icon: ShieldCheck,
  },
  {
    title: "Aynı Gün Kargo",
    description: "Uygun siparişleriniz hızla hazırlanıp kargoya teslim edilir.",
    icon: Truck,
  },
  {
    title: "Türkiye Geneli Teslimat",
    description:
      "Siparişleriniz anlaşmalı taşıyıcılarla adresinize ulaştırılır.",
    icon: MapPin,
  },
  {
    title: "Satış Sonrası Destek",
    description: "Satın alma sonrasında da ihtiyaç duyduğunuzda yanınızdayız.",
    icon: HeadphonesIcon,
  },
];

const paymentItems: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Peşin Fiyat Avantajı",
    description: "Uygun ürünlerde sunulan peşin ödeme avantajlarını keşfedin.",
    icon: Banknote,
  },
  {
    title: "Kredi Kartına Taksit",
    description:
      "Uygun kart ve ürünlerde sunulan taksit seçeneklerini inceleyin.",
    icon: CreditCard,
  },
  {
    title: "Mağazada Elden Taksit",
    description:
      "Mağazamızda sunulan ödeme seçenekleri için ekibimizle görüşün.",
    icon: Building2,
  },
];

const featuredBrandNames = ["apple", "samsung", "huawei", "lenovo", "jbl"];

const brandLogoFallbacks: Record<string, string> = {
  apple: "/images/brands/apple.svg",
  samsung: "/images/brands/samsung.svg",
  huawei: "/images/brands/huawei.svg",
  lenovo: "/images/brands/lenovo.svg",
  jbl: "/images/brands/jbl.svg",
};

function normalizeBrand(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function WhyCenterGsm() {
  return (
    <RevealSection
      aria-labelledby="why-center-gsm-title"
      className="py-8 sm:py-16"
    >
      <Container>
        <SectionTitle
          id="why-center-gsm-title"
          eyebrow="Güven"
          title="Neden CENTER GSM?"
          description="Teknoloji alışverişinizi güvenle tamamlayın."
        />
        <StaggerContainer className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {confidenceItems.map(({ title, description, icon: Icon }) => (
            <AnimatedCard key={title} className="h-full">
              <article className="home-premium-interactive home-premium-surface group flex h-full items-start gap-4 border border-zinc-200/80 bg-white p-5 sm:min-h-44 sm:p-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white shadow-[0_12px_28px_rgba(9,9,11,0.18)] transition-[transform,background-color,box-shadow] duration-300 ease-premium group-hover:scale-105 group-hover:bg-primary group-hover:shadow-[0_16px_34px_rgba(220,38,38,0.26)]">
                  <Icon
                    className="size-6"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-[-0.025em] text-zinc-950 sm:text-lg">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {description}
                  </p>
                </div>
              </article>
            </AnimatedCard>
          ))}
        </StaggerContainer>
      </Container>
    </RevealSection>
  );
}

export function PaymentAdvantages() {
  return (
    <RevealSection
      aria-labelledby="payment-advantages-title"
      className="bg-zinc-950 py-10 text-white sm:py-20"
    >
      <Container>
        <SectionTitle
          id="payment-advantages-title"
          eyebrow="Esnek ödeme"
          title="Ödeme Avantajları"
          description="Alışverişinize uygun ödeme alternatiflerini değerlendirin."
          inverted
        />
        <StaggerContainer className="grid gap-3 md:grid-cols-3 md:gap-4">
          {paymentItems.map(({ title, description, icon: Icon }) => (
            <AnimatedCard key={title} className="h-full">
              <article className="group relative h-full min-h-56 overflow-hidden rounded-[var(--home-premium-radius)] border border-white/10 bg-white/[0.055] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-7">
                <span
                  className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-red-500/80 to-transparent"
                  aria-hidden="true"
                />
                <span className="grid size-12 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-400 transition-transform duration-300 ease-premium group-hover:scale-105">
                  <Icon
                    className="size-6"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-7 text-xl font-black tracking-[-0.035em] text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {description}
                </p>
              </article>
            </AnimatedCard>
          ))}
        </StaggerContainer>
      </Container>
    </RevealSection>
  );
}

export async function BrandShowcase() {
  const result = await getBrands();
  const brandsByName = new Map(
    result.data.map((brand) => [normalizeBrand(brand.name), brand]),
  );
  const brands = featuredBrandNames.flatMap((name) => {
    const brand = brandsByName.get(name);
    return brand ? [{ ...brand, normalizedName: name }] : [];
  });

  return (
    <RevealSection
      aria-labelledby="brand-showcase-title"
      className="py-8 sm:py-16"
    >
      <Container>
        <SectionTitle
          id="brand-showcase-title"
          eyebrow="Seçkin markalar"
          title="Marka Vitrini"
          description="Dünyanın önde gelen teknoloji markalarının ürünlerini keşfedin."
        />
        {brands.length ? (
          <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {brands.map((brand) => {
              const logo =
                brandLogoFallbacks[brand.normalizedName] || brand.logo_url;

              return (
                <AnimatedCard key={brand.id} className="h-full">
                  <Link
                    href={`/urunler?brand=${encodeURIComponent(brand.slug)}`}
                    aria-label={`${brand.name} ürünlerini incele`}
                    className="home-premium-interactive group relative flex h-full min-h-52 flex-col overflow-hidden rounded-[var(--home-premium-radius)] border border-zinc-200/80 bg-zinc-950 p-5 shadow-[0_18px_54px_rgba(15,23,42,0.12)] sm:min-h-64 sm:p-6"
                  >
                    <span
                      className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(220,38,38,0.2),transparent_42%),linear-gradient(145deg,rgba(255,255,255,0.06),transparent_48%)]"
                      aria-hidden="true"
                    />
                    <span className="relative flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white px-4 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      {logo ? (
                        <Image
                          src={logo}
                          alt={`${brand.name} logosu`}
                          width={150}
                          height={64}
                          className="max-h-12 w-auto max-w-full object-contain transition-transform duration-300 ease-premium group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-xl font-black text-zinc-950">
                          {brand.name}
                        </span>
                      )}
                    </span>
                    <span className="relative mt-5 flex items-center justify-between gap-3 text-sm font-bold text-white">
                      <span>{brand.name}</span>
                      <span className="text-xs text-zinc-400 transition-colors group-hover:text-red-400">
                        Ürünleri İncele
                      </span>
                    </span>
                  </Link>
                </AnimatedCard>
              );
            })}
          </StaggerContainer>
        ) : (
          <div className="home-premium-surface border border-zinc-200/80 bg-white px-6 py-12 text-center text-sm text-zinc-500">
            Marka vitrini güncelleniyor.
          </div>
        )}
      </Container>
    </RevealSection>
  );
}

const categoryLinks = [
  { label: "Telefon", href: "/kategori/telefon" },
  { label: "Tablet", href: "/kategori/tablet" },
  { label: "Laptop", href: "/kategori/laptoplar" },
  { label: "Akıllı Saat", href: "/kategori/akilli-saat" },
] as const;

export function HomepageFooterCta() {
  return (
    <RevealSection
      aria-labelledby="homepage-footer-cta-title"
      className="pb-8 pt-2 sm:pb-16 sm:pt-4"
    >
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-950 px-5 py-10 text-center shadow-[0_28px_80px_rgba(9,9,11,0.2)] sm:px-10 sm:py-16">
          <span
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.3),transparent_44%),linear-gradient(120deg,transparent_22%,rgba(255,255,255,0.045)_50%,transparent_78%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-400">
              CENTER GSM
            </p>
            <h2
              id="homepage-footer-cta-title"
              className="mt-3 text-balance text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl"
            >
              Hayalindeki teknolojiyi şimdi keşfet.
            </h2>
            <StaggerContainer className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4">
              {categoryLinks.map((category) => (
                <AnimatedCard key={category.href} className="h-full">
                  <Link
                    href={category.href}
                    className="flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm font-bold text-white transition-[background-color,border-color,color] duration-200 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300 sm:min-h-16 sm:text-base"
                  >
                    {category.label}
                  </Link>
                </AnimatedCard>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </Container>
    </RevealSection>
  );
}
