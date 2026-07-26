import Link from "next/link";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Youtube,
} from "lucide-react";

import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { IconButton } from "@/components/ui/icon-button";

const linkGroups = [
  {
    title: "Kurumsal",
    links: ["Hakkımızda", "Mağazalarımız", "Kariyer", "İletişim"],
  },
  {
    title: "Müşteri Hizmetleri",
    links: ["Sipariş Takibi", "İade ve Değişim", "Garanti", "Teknik Servis"],
  },
  {
    title: "Yasal",
    links: ["KVKK", "Gizlilik", "Mesafeli Satış", "Çerez Tercihleri"],
  },
];

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-white">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr] lg:gap-20">
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
              <Link
                href="tel:08500000000"
                className="flex w-fit items-center gap-3 transition-colors duration-200 hover:text-white"
              >
                <Phone className="size-4 text-red-500" aria-hidden="true" />
                0850 000 00 00
              </Link>
              <Link
                href="mailto:destek@centergsm.com"
                className="flex w-fit items-center gap-3 transition-colors duration-200 hover:text-white"
              >
                <Mail className="size-4 text-red-500" aria-hidden="true" />
                destek@centergsm.com
              </Link>
              <p className="flex items-center gap-3">
                <MapPin className="size-4 text-red-500" aria-hidden="true" />
                Türkiye genelinde hizmet
              </p>
            </address>
          </div>

          <nav
            aria-label="Alt bilgi bağlantıları"
            className="grid gap-9 sm:grid-cols-3"
          >
            {linkGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-bold text-white">{group.title}</h2>
                <ul className="mt-5 space-y-3.5">
                  {group.links.map((label) => (
                    <li key={label}>
                      <Link
                        href={
                          label === "Sipariş Takibi" ? "/siparis-takip" : "/"
                        }
                        className="rounded-sm text-sm text-zinc-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <Divider className="my-10 bg-white/10" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
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
            <SocialLink label="Instagram" icon={Instagram} />
            <SocialLink label="Facebook" icon={Facebook} />
            <SocialLink label="YouTube" icon={Youtube} />
          </div>
        </div>
      </Container>
    </footer>
  );
}

function SocialLink({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Instagram;
}) {
  return (
    <IconButton
      label={label}
      variant="outline"
      className="border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-white"
      disabled
    >
      <Icon className="size-4" aria-hidden="true" />
    </IconButton>
  );
}
