import Link from "next/link";

import { CartHeaderAction } from "@/components/cart/cart-header-action";
import { FavoritesHeaderAction } from "@/components/favorites/favorites-header-action";
import { ComparisonHeaderAction } from "@/components/comparison/comparison-header-action";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { GlobalSearch } from "@/components/search/global-search";
import { AccountHeaderAction } from "@/components/account/account-header-action";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { DesktopCategoryNavigation } from "@/components/layout/desktop-category-navigation";
import { getCategories } from "@/lib/catalog/data";
import { getSiteSettings } from "@/lib/settings/site-settings";

function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="CENTER GSM ana sayfa"
      className="group flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="grid size-9 place-items-center rounded-md bg-zinc-950 text-sm font-black text-white shadow-sm transition-transform duration-200 ease-premium group-hover:-rotate-3">
        C
      </span>
      <span className="hidden min-[375px]:block">
        <span className="block text-lg font-black leading-none tracking-[-0.055em] sm:text-xl">
          CENTER<span className="text-primary">GSM</span>
        </span>
        <span className="mt-1 hidden text-[8px] font-bold uppercase tracking-[0.25em] text-muted sm:block">
          Teknolojinin Merkezi
        </span>
      </span>
    </Link>
  );
}

export async function Header() {
  const [categoryResult, settings] = await Promise.all([
    getCategories(),
    getSiteSettings(),
  ]);
  const navigationCategories = categoryResult.data;

  return (
    <header className="storefront-header sticky top-0 z-sticky border-b border-border/80 bg-white/95 backdrop-blur-xl">
      <div className="bg-zinc-950 text-white">
        <Container className="flex h-6 items-center justify-center text-[10px] font-semibold sm:justify-between sm:text-[11px]">
          <p>
            {new Intl.NumberFormat("tr-TR", {
              maximumFractionDigits: 0,
            }).format(settings.free_shipping_limit)}{" "}
            TL üzeri alışverişlerde ücretsiz kargo
          </p>
          <p className="hidden text-zinc-400 sm:block">
            Orijinal ürün • Güvenli alışveriş • Teknik destek
          </p>
        </Container>
      </div>

      <Container>
        <div className="flex h-14 items-center gap-2 sm:h-16 lg:gap-6">
          <MobileNavigation categories={navigationCategories} />
          <BrandLogo />

          <div className="hidden flex-1 md:block">
            <GlobalSearch variant="desktop" />
          </div>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <ComparisonHeaderAction />
            <FavoritesHeaderAction />
            <CartHeaderAction />
            <AccountHeaderAction />
          </div>
        </div>

        <div className="pb-2 md:hidden">
          <GlobalSearch variant="mobile" />
        </div>
      </Container>

      <Divider />
      <nav
        id="desktop-navigation"
        aria-label="Ürün kategorileri"
        className="hidden lg:block"
      >
        <Container className="flex h-10 items-center">
          <DesktopCategoryNavigation categories={navigationCategories} />
        </Container>
      </nav>
    </header>
  );
}
