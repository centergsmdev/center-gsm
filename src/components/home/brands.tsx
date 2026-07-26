import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";

const brands = ["Apple", "SAMSUNG", "Xiaomi", "HUAWEI", "Lenovo", "JBL"];

export function Brands() {
  return (
    <section aria-labelledby="brands-title" className="reveal-on-scroll py-10 sm:py-14">
      <Container>
        <SectionTitle
          id="brands-title"
          eyebrow="Markalar"
          title="Dünyanın önde gelen teknoloji markaları"
        />
        <div className="stagger-grid grid grid-cols-2 overflow-hidden rounded-lg border border-white/80 bg-white/60 shadow-sm backdrop-blur sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((brand) => (
            <div
              key={brand}
              className="group grid h-20 place-items-center border-b border-r border-border/70 bg-white/70 px-4 text-center transition-all duration-200 hover:bg-zinc-950 hover:shadow-inner sm:h-24"
            >
              <span className="text-base font-black tracking-tight text-zinc-400 transition-colors group-hover:text-white sm:text-lg">
                {brand}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
