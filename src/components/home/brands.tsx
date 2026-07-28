import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { getBrands } from "@/lib/catalog/data";
import { MobileSectionHeading } from "./mobile-section-heading";

const brandLogos: Record<string, string> = {
  apple: "/images/brands/apple.svg",
  samsung: "/images/brands/samsung.svg",
  xiaomi: "/images/brands/xiaomi.svg",
  huawei: "/images/brands/huawei.svg",
  lenovo: "/images/brands/lenovo.svg",
  jbl: "/images/brands/jbl.svg",
};

export async function Brands() {
  const result = await getBrands();
  const brands = result.data.flatMap((brand) => {
    const logo = brandLogos[brand.name.toLocaleLowerCase("tr-TR")];
    return logo ? [{ ...brand, logo }] : [];
  });
  return (
    <section aria-label="Markalar" className="reveal-on-scroll py-6 sm:py-16">
      <Container>
        <MobileSectionHeading id="brands-title">Markalar</MobileSectionHeading>
        <div className="hidden sm:block">
          <SectionTitle
            id="brands-title-desktop"
            eyebrow="Markalar"
            title="Dünyanın önde gelen teknoloji markaları"
            description="Güvendiğiniz global markaların seçkin teknoloji ürünleri CENTER GSM'de."
          />
        </div>
        <div className="stagger-grid grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 lg:gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/urunler?brand=${brand.slug}`}
              aria-label={`${brand.name} ürünlerini incele`}
              className="brand-premium-card home-premium-interactive home-premium-surface group relative grid min-h-24 place-items-center overflow-hidden border border-zinc-200/80 bg-white px-4 sm:min-h-36 sm:px-6"
            >
              <span
                className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-red-500/0 to-transparent transition-all duration-300 group-hover:via-red-500/70"
                aria-hidden="true"
              />
              <Image
                src={brand.logo}
                alt={`${brand.name} logosu`}
                width={132}
                height={52}
                className="max-h-9 w-auto max-w-[85%] object-contain opacity-75 transition-[transform,opacity,filter] duration-300 ease-premium group-hover:scale-105 group-hover:opacity-100 sm:max-h-11 sm:max-w-full"
              />
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
