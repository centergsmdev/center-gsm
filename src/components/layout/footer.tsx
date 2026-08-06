import Link from "next/link";
import { MapPin } from "lucide-react";

import {
  FacebookLogo,
  InstagramLogo,
  YoutubeLogo,
} from "@/components/layout/social-logos";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { footerLinkGroups, socialLinks } from "@/lib/footer/navigation";
import { getSiteSettings } from "@/lib/settings/site-settings";

const socialLogos = {
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  youtube: YoutubeLogo,
} as const;

export async function Footer() {
  const settings = await getSiteSettings();
  const configuredSocialLinks = socialLinks.map((social) => ({
    ...social,
    href:
      social.id === "instagram"
        ? settings.instagram_url
        : social.id === "youtube"
          ? settings.youtube_url
          : null,
  }));
  return (
    <footer className="bg-zinc-950 text-white">
      <Container className="py-10 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_2fr] lg:gap-20">
          <div>
            <Link
              href="/"
              aria-label="CENTER GSM ana sayfa"
              className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="grid size-9 place-items-center rounded-md bg-white text-sm font-black text-zinc-950">
                C
              </span>
              <span className="text-xl font-black tracking-[-0.055em]">
                CENTER<span className="text-red-500">GSM</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-400">
              Teknolojiyi güven, uzmanlık ve kusursuz müşteri deneyimiyle
              buluşturuyoruz.
            </p>
            <address className="mt-6 space-y-3 text-sm not-italic text-zinc-400">
              <p className="flex items-center gap-3">
                <MapPin className="size-4 text-red-500" aria-hidden="true" />
                Türkiye genelinde hizmet
              </p>
              {settings.address ? <p>{settings.address}</p> : null}
              {settings.phone ? <p>{settings.phone}</p> : null}
              {settings.contact_email ? <p>{settings.contact_email}</p> : null}
            </address>
          </div>

          <nav
            aria-label="Alt bilgi bağlantıları"
            className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3"
          >
            {footerLinkGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-bold text-white">{group.title}</h2>
                <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-3.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-sm leading-5 text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <Divider className="my-8 bg-white/10 sm:my-10" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-zinc-500">
              © 2026 CENTER GSM. Tüm hakları saklıdır.
            </p>
            <p className="mt-2 text-[11px] text-zinc-600">
              Güvenli ödeme altyapısı • Distribütör garantili ürünler
            </p>
          </div>
          <div
            className="flex items-center gap-2"
            aria-label="Sosyal medya bağlantıları"
          >
            {configuredSocialLinks.map((social) => {
              const Logo = socialLogos[social.id];
              const className =
                "grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 transition duration-300 motion-reduce:transition-none";
              if (!social.href)
                return (
                  <span
                    key={social.id}
                    aria-label={`${social.label} bağlantısı yakında`}
                    role="img"
                    className={`${className} cursor-not-allowed opacity-60`}
                  >
                    <Logo className="size-5" />
                  </span>
                );
              return (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`CENTER GSM ${social.label} hesabını yeni sekmede aç`}
                  className={`${className} hover:scale-105 hover:border-white/25 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500`}
                >
                  <Logo className="size-5" />
                </a>
              );
            })}
          </div>
        </div>
      </Container>
    </footer>
  );
}
