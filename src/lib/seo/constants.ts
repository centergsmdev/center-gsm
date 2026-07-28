export const SEO_CONFIG = {
  siteName: "CENTER GSM",
  siteUrl: (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://center-gsm-v2.vercel.app"
  ).replace(/\/+$/, ""),
  defaultTitle: "CENTER GSM | Teknolojinin Merkezi",
  titleTemplate: "%s | CENTER GSM",
  defaultDescription:
    "Telefon, bilgisayar ve aksesuarlarda güvenilir, hızlı ve premium teknoloji alışveriş deneyimi.",
  defaultKeywords: [
    "CENTER GSM",
    "teknoloji mağazası",
    "telefon",
    "bilgisayar",
    "aksesuar",
    "elektronik",
  ],
  defaultLocale: "tr_TR",
  defaultRobots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  twitterHandle: "@centergsm",
  organizationName: "CENTER GSM",
  organizationLogo: "/logo.svg",
  supportEmail: "destek@centergsm.com",
  supportPhone: "+90 850 000 00 00",
} as const;
export const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
} as const;
