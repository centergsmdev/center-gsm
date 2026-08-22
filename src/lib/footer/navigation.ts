export const footerLinkGroups = [
  {
    title: "Kurumsal",
    links: [
      { label: "Hakkımızda", href: "/hakkimizda" },
      { label: "Mağazalarımız", href: "/magazalarimiz" },
      { label: "Kariyer", href: "/kariyer" },
      { label: "İletişim", href: "/iletisim" },
    ],
  },
  {
    title: "Müşteri Hizmetleri",
    links: [
      { label: "Sipariş Takibi", href: "/siparis-takip" },
      { label: "İade ve Değişim", href: "/iade-ve-degisim" },
      { label: "Garanti", href: "/garanti" },
      { label: "Teknik Servis", href: "/teknik-servis" },
      { label: "Sık Sorulan Sorular", href: "/sikca-sorulan-sorular" },
      { label: "Müşteri Memnuniyeti", href: "/musteri-memnuniyeti" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { label: "KVKK", href: "/kvkk" },
      { label: "Gizlilik", href: "/gizlilik" },
      { label: "Mesafeli Satış", href: "/mesafeli-satis" },
      { label: "Çerez Tercihleri", href: "/cerez-tercihleri" },
    ],
  },
] as const;

export const socialLinks = [
  { id: "instagram", label: "Instagram", href: null },
  { id: "facebook", label: "Facebook", href: null },
  { id: "youtube", label: "YouTube", href: null },
] as const;
