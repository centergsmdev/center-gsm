import { ShieldCheck, Truck } from "lucide-react";

import {
  AnimatedCard,
  RevealSection,
  StaggerContainer,
} from "@/components/motion/motion-system";
import { PartnerLogo } from "@/components/shared/partner-logo";
import { Container } from "@/components/ui/container";
import type { PublicPaymentPartner } from "@/payments/repository/public-payment-partner-repository";
import type { PublicShippingCarrier } from "@/shipping/repository/public-shipping-repository";

function LogoCard({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <AnimatedCard
      className="size-[72px] shrink-0 snap-start rounded-2xl"
      aria-label={label}
    >
      <div className="grid size-[72px] place-items-center rounded-2xl border border-zinc-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.07)] transition-shadow duration-200 hover:shadow-[0_13px_30px_rgba(15,23,42,0.12)]">
        {children}
      </div>
    </AnimatedCard>
  );
}

export function TrustSection({
  carriers,
  paymentPartners,
}: {
  carriers: PublicShippingCarrier[];
  paymentPartners: PublicPaymentPartner[];
}) {
  return (
    <RevealSection
      aria-labelledby="trust-section-title"
      className="pb-8 sm:pb-16"
    >
      <Container>
        <div className="home-premium-surface border border-white/80 bg-white/85 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur-sm sm:p-7 lg:p-9">
          <h2 id="trust-section-title" className="sr-only">
            Teslimat ve ödeme çözüm ortaklarımız
          </h2>
          <div className="grid gap-7 lg:grid-cols-2 lg:gap-10">
            <PartnerGroup
              icon={<Truck className="size-5" aria-hidden="true" />}
              title="Teslimat Çözüm Ortaklarımız"
              description="Siparişleriniz Türkiye'nin güvenilir kargo firmaları ile güvenle teslim edilir."
            >
              {carriers.length ? (
                carriers.map((carrier) => (
                  <LogoCard key={carrier.id} label={carrier.name}>
                    <PartnerLogo
                      name={carrier.name}
                      logoUrl={carrier.logoUrl}
                    />
                  </LogoCard>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  Aktif teslimat çözüm ortağı bilgisi güncelleniyor.
                </p>
              )}
            </PartnerGroup>

            <PartnerGroup
              icon={<ShieldCheck className="size-5" aria-hidden="true" />}
              title="Ödeme Çözümlerimiz"
              description="Tüm ödemeler SSL ile korunur ve uluslararası güvenlik standartlarına uygun şekilde işlenir."
            >
              {paymentPartners.length ? (
                paymentPartners.map((partner) => (
                  <LogoCard key={partner.id} label={partner.name}>
                    <PartnerLogo
                      name={partner.name}
                      logoUrl={partner.logoUrl}
                      className="h-9 w-14"
                    />
                  </LogoCard>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  Aktif ödeme çözüm ortağı bilgisi güncelleniyor.
                </p>
              )}
            </PartnerGroup>
          </div>

          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 sm:mt-9 sm:items-center sm:p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white shadow-sm">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium leading-6 text-zinc-600">
              Tüm siparişler Türkiye&apos;nin güvenilir kargo firmalarıyla
              gönderilir. Ödemeler SSL ile korunur ve uluslararası güvenlik
              standartlarına uygun şekilde güvenle işlenir.
            </p>
          </div>
        </div>
      </Container>
    </RevealSection>
  );
}

function PartnerGroup({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="min-w-0">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-red-50 text-primary">
          {icon}
        </span>
        <h3 className="text-lg font-black tracking-[-0.035em] text-zinc-950 sm:text-xl">
          {title}
        </h3>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
        {description}
      </p>
      <StaggerContainer className="mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {children}
      </StaggerContainer>
    </section>
  );
}
