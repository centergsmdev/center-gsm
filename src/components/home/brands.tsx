import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { getBrands } from "@/lib/catalog/data";

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
    <section
      aria-labelledby="brands-title"
      className="reveal-on-scroll py-12 sm:py-16"
    >
      <Container>
        <SectionTitle
          id="brands-title"
          eyebrow="Markalar"
          title="Dünyanın önde gelen teknoloji markaları"
          description="Güvendiğiniz global markaların seçkin teknoloji ürünleri CENTER GSM'de."
        />
        <div className="stagger-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/urunler?brand=${brand.slug}`}
              aria-label={`${brand.name} ürünlerini incele`}
              className="brand-premium-card home-premium-interactive home-premium-surface group relative grid min-h-32 place-items-center overflow-hidden border border-zinc-200/80 bg-white px-6 sm:min-h-36"
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
                className="max-h-11 w-auto max-w-full object-contain opacity-75 transition-[transform,opacity,filter] duration-300 ease-premium group-hover:scale-105 group-hover:opacity-100"
              />
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
