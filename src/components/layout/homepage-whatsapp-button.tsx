import { MessageCircle } from "lucide-react";

import { getSiteSettings } from "@/lib/settings/site-settings";

function buildWhatsAppHref(value?: string | null) {
  let digits = (value ?? "").replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) {
    digits = `90${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  }

  if (!/^\d{11,15}$/.test(digits)) {
    return null;
  }

  const message = encodeURIComponent(
    "Merhaba, CENTER GSM \u00fczerinden bilgi almak istiyorum.",
  );

  return `https://wa.me/${digits}?text=${message}`;
}

export async function HomepageWhatsAppButton() {
  const settings = await getSiteSettings();
  const href = buildWhatsAppHref(settings.phone);

  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={"WhatsApp ile ileti\u015fime ge\u00e7"}
      className="fixed bottom-[76px] right-4 z-[999] flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-xl transition hover:bg-[#1fb85a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:bottom-[84px] sm:right-6"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      WhatsApp
    </a>
  );
}
