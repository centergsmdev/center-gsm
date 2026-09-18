"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileSignature,
  FileText,
  IdCard,
  PackageCheck,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Container } from "@/components/ui/container";
import { trackLandingEvent } from "@/lib/meta/browser";

type PaymentInfo = {
  threshold: string;
  aboveThresholdRate: string;
  belowThresholdRate: string;
  financeChargeRate: string;
  installmentCounts: number[];
  timingOptions: string[];
  example: {
    productPrice: string;
    downPaymentRate: string;
    downPayment: string;
    remainingPrincipal: string;
    financeCharge: string;
    financedTotal: string;
    installmentCount: number;
    monthlyInstallment: string;
    totalPayable: string;
  };
};

type InstallmentLandingProps = {
  videoUrl: string | null;
  paymentInfo: PaymentInfo | null;
};

const applicationSteps = [
  {
    title: "Ürünü seçin",
    description:
      "Katalogdan satın almak istediğiniz ürünü açın. Yalnızca elden taksite açık ürünlerde başvuru seçeneği görünür.",
    icon: Search,
  },
  {
    title: "Ödeme planını inceleyin",
    description:
      "Ürün sayfasındaki hesaplamada peşinatı, vade farkını ve aylık ödemeyi başvurmadan önce görün.",
    icon: WalletCards,
  },
  {
    title: "Başvuruyu başlatın",
    description:
      "“Elden Taksit Başvurusu” butonuna basın ve onaylanırsa peşinatı ne zaman ödeyebileceğinizi seçin.",
    icon: ClipboardCheck,
  },
  {
    title: "Formu tamamlayın",
    description:
      "İletişim bilgilerinizi girin, vadenizi seçin, sözleşmeyi okuyun ve gerekli belgeleri güvenli forma yükleyin.",
    icon: FileSignature,
  },
  {
    title: "Değerlendirmeyi bekleyin",
    description:
      "Başvurunuz ekip tarafından incelenir. Başvuru göndermek otomatik onay veya satış anlamına gelmez.",
    icon: ShieldCheck,
  },
  {
    title: "Onay sonrası ödeme",
    description:
      "Onaylanırsa size özel takip ekranından peşinatı yatırın, dekontu yükleyin ve teslimat durumunu takip edin.",
    icon: PackageCheck,
  },
] as const;

const documents = [
  {
    title: "Kimlik ön yüzü",
    description: "Geçerli kimlik belgenizin okunaklı ön yüzü.",
    icon: IdCard,
  },
  {
    title: "Kimlik arka yüzü",
    description: "Geçerli kimlik belgenizin okunaklı arka yüzü.",
    icon: IdCard,
  },
  {
    title: "Güncel ikametgâh",
    description: "e-Devlet üzerinden alınmış güncel ikametgâh belgesi.",
    icon: FileText,
  },
  {
    title: "Dijital imza",
    description:
      "Sözleşmeyi okuduktan sonra başvuru ekranında atacağınız imza.",
    icon: FileSignature,
  },
] as const;

const readinessItems = [
  "Tanıtım videosunu izledim ve sayfadaki süreci okudum.",
  "Satın almak istediğim ürünü belirlemek için ürünleri incelemeye hazırım.",
  "Başvurum onaylanırsa gösterilen peşinatı seçtiğim zamanda ödeyebilirim.",
  "Gerekli belgeleri hazırlayabilirim ve başvurunun kesin onay olmadığını biliyorum.",
] as const;

function getYouTubeEmbedUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be")
      videoId = url.pathname.slice(1).split("/")[0] ?? "";
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") ?? "";
      else if (
        url.pathname.startsWith("/embed/") ||
        url.pathname.startsWith("/shorts/")
      )
        videoId = url.pathname.split("/")[2] ?? "";
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
      : null;
  } catch {
    return null;
  }
}

function LandingVideo({ videoUrl }: { videoUrl: string | null }) {
  const [youtubeStarted, setYoutubeStarted] = useState(false);
  const directVideoTracked = useRef(false);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(videoUrl);

  if (!videoUrl)
    return (
      <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.18),transparent_44%),linear-gradient(145deg,#18181b,#09090b)] px-6 text-center text-white">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-full border border-white/15 bg-white/10 shadow-2xl">
            <Play className="ml-1 size-7 text-red-400" aria-hidden="true" />
          </span>
          <p className="mt-5 text-base font-black">
            Bilgilendirme videosu hazırlanıyor
          </p>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-zinc-400 sm:text-sm sm:leading-6">
            Video yönetim panelinden eklendiğinde bu alanda oynatılacak. Güncel
            süreç ve koşulların tamamını aşağıda inceleyebilirsiniz.
          </p>
        </div>
      </div>
    );

  if (youtubeEmbedUrl)
    return youtubeStarted ? (
      <iframe
        src={youtubeEmbedUrl}
        title="CENTER GSM elden taksit başvuru süreci"
        className="aspect-video w-full bg-black"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <button
        type="button"
        onClick={() => {
          setYoutubeStarted(true);
          trackLandingEvent("elden_taksit_video_start", {
            provider: "youtube",
          });
        }}
        className="group flex aspect-video w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.2),transparent_42%),linear-gradient(145deg,#18181b,#09090b)] px-6 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
        aria-label="Elden taksit bilgilendirme videosunu oynat"
      >
        <span>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-600 shadow-[0_18px_60px_rgba(220,38,38,0.4)] transition group-hover:scale-105">
            <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
          </span>
          <span className="mt-5 block text-base font-black">
            Videoyu izleyin
          </span>
          <span className="mt-1 block text-xs text-zinc-400">
            Başvurmadan önce süreci öğrenin
          </span>
        </span>
      </button>
    );

  return (
    <video
      controls
      preload="metadata"
      playsInline
      className="aspect-video w-full bg-black object-contain"
      onPlay={() => {
        if (directVideoTracked.current) return;
        directVideoTracked.current = true;
        trackLandingEvent("elden_taksit_video_start", { provider: "direct" });
      }}
    >
      <source src={videoUrl} />
      Tarayıcınız video oynatmayı desteklemiyor.
    </video>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-zinc-950 sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function InstallmentLanding({
  videoUrl,
  paymentInfo,
}: InstallmentLandingProps) {
  const [confirmedItems, setConfirmedItems] = useState<number[]>([]);
  const qualificationTracked = useRef(false);
  const ready =
    Boolean(paymentInfo) && confirmedItems.length === readinessItems.length;

  const faqs = useMemo(
    () => [
      {
        question: "Kredi kartı gerekiyor mu?",
        answer:
          "Hayır. Bu, kredi kartı kullanmadan yapılan ayrı bir elden taksit başvurusudur. Başvurunuz değerlendirme sonucunda onaylanabilir veya reddedilebilir.",
      },
      {
        question: "Peşinat ne kadar?",
        answer: paymentInfo
          ? `${paymentInfo.threshold} ve üzerindeki ürünlerde %${paymentInfo.aboveThresholdRate}; bu tutarın altındaki ürünlerde %${paymentInfo.belowThresholdRate} peşinat uygulanır. Kesin tutarı ürün sayfasındaki ödeme planında görürsünüz.`
          : "Peşinat oranı güncel sistem ayarına ve ürün fiyatına göre hesaplanır. Kesin tutarı ürün sayfasındaki ödeme planında görürsünüz.",
      },
      {
        question: "Kaç ay taksit yapılabiliyor?",
        answer: paymentInfo
          ? `Güncel seçenekler ${paymentInfo.installmentCounts.join(", ")} aydır. Ürün sayfasında ve başvuru sırasında uygun vadeyi seçebilirsiniz.`
          : "Güncel vade seçenekleri ürün sayfasındaki ödeme planında gösterilir.",
      },
      {
        question: "Vade farkı nasıl hesaplanıyor?",
        answer: paymentInfo
          ? `Peşinat ürün fiyatından düşüldükten sonra kalan tutara bir defaya mahsus %${paymentInfo.financeChargeRate} vade farkı uygulanır. Aylık ödemeler bu toplam üzerinden bölünür.`
          : "Peşinat düşüldükten sonra kalan tutara güncel vade farkı uygulanır ve taksitlere bölünür.",
      },
      {
        question: "Hangi belgeler gerekiyor?",
        answer:
          "Kimliğin ön ve arka yüzü, e-Devlet'ten alınmış güncel ikametgâh belgesi ve başvuru ekranında atılan dijital imza gerekir.",
      },
      {
        question: "Belgeleri WhatsApp'tan mı göndereceğim?",
        answer:
          "Hayır. Belgeler yalnızca CENTER GSM'nin güvenli başvuru formuna yüklenir. Bu sayfa ve WhatsApp üzerinden belge göndermeyin.",
      },
      {
        question: "Başvuru kesin onaylanır mı?",
        answer:
          "Hayır. Başvuru göndermek otomatik onay, sipariş veya satış anlamına gelmez. Her başvuru ekip tarafından ayrıca değerlendirilir.",
      },
      {
        question: "Başvuruyu nereden yapacağım?",
        answer:
          "Önce ürünler sayfasından elden taksite açık ürünü seçin. Ürün sayfasındaki ödeme planını inceledikten sonra “Elden Taksit Başvurusu” butonuyla güvenli forma geçin.",
      },
      {
        question: "Onaydan sonra ne olur?",
        answer:
          "Onay sonrasında size özel takip ekranı açılır. Peşinatı bu ekrandaki ödeme bilgilerine göre yatırır, dekontu yine bu güvenli ekrana yükler ve süreci takip edersiniz.",
      },
    ],
    [paymentInfo],
  );

  useEffect(() => {
    trackLandingEvent("elden_taksit_page_view");
  }, []);

  useEffect(() => {
    if (!ready || qualificationTracked.current) return;
    qualificationTracked.current = true;
    trackLandingEvent("elden_taksit_terms_confirmed");
  }, [ready]);

  return (
    <main className="overflow-hidden bg-white">
      <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_12%,rgba(220,38,38,0.26),transparent_34%),radial-gradient(circle_at_10%_90%,rgba(59,130,246,0.12),transparent_34%)]" />
        <Container className="py-12 sm:py-20 lg:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-zinc-300 sm:text-xs">
              <ShieldCheck
                className="size-4 text-emerald-400"
                aria-hidden="true"
              />
              Başvurmadan önce tüm süreci öğrenin
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.055em] sm:text-5xl lg:text-7xl">
              Kredi Kartı Olmadan{" "}
              <span className="text-red-500">Elden Taksit</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              Ürün seçimi, peşinat, taksit planı, gerekli belgeler,
              değerlendirme ve onay sonrası ödeme adımlarının tamamını
              inceleyin. Koşullar size uygunsa güvenli başvuruya ilerleyin.
            </p>
            <a
              href="#video"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_40px_rgba(220,38,38,0.28)] transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Önce Süreci İzle
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          </div>
        </Container>
      </section>

      <section className="border-b border-zinc-200 bg-zinc-50 py-8 sm:py-10">
        <Container>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Şartları öğrenin"],
              ["02", "Ürünü ve ödeme planını seçin"],
              ["03", "Hazırsanız başvurun"],
            ].map(([number, label]) => (
              <div
                key={number}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-950 text-xs font-black text-white">
                  {number}
                </span>
                <p className="text-sm font-black text-zinc-900">{label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section id="video" className="scroll-mt-28 bg-white py-14 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Önce videoyu izleyin"
            title="Elden Taksit Başvurusu Nasıl Yapılır?"
            description="Video; ürünü nereden seçeceğinizi, ödeme planını nasıl okuyacağınızı, başvuru formunu ve onay sonrası takip ekranını adım adım anlatmak için hazırlanmıştır."
          />
          <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-[0_24px_70px_rgba(9,9,11,0.14)] sm:rounded-3xl">
            <LandingVideo videoUrl={videoUrl} />
          </div>
        </Container>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50 py-14 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Gerçek başvuru akışı"
            title="Baştan sona nasıl ilerler?"
            description="WhatsApp'tan belge gönderme veya mesajla başvuru yoktur. İşlem ürün sayfasından başlar ve güvenli CENTER GSM ekranlarında tamamlanır."
          />
          <ol className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applicationSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-zinc-950 text-white">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-black text-zinc-950">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Güncel ödeme koşulları"
            title="Başvurmadan önce bilmeniz gerekenler"
            description="Aşağıdaki oran ve vadeler yönetim panelindeki aktif elden taksit ayarlarından alınır; böylece burada gördüğünüz bilgi ürün sayfasındaki hesaplamayla aynı kalır."
          />
          {paymentInfo ? (
            <>
              <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <Banknote
                    className="size-6 text-red-600"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-black">Peşinat oranı</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {paymentInfo.threshold} ve üzerindeki ürünlerde{" "}
                    <strong>%{paymentInfo.aboveThresholdRate}</strong>,
                    altındaki ürünlerde{" "}
                    <strong>%{paymentInfo.belowThresholdRate}</strong>.
                  </p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <WalletCards
                    className="size-6 text-red-600"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-black">Vade farkı</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Peşinat düştükten sonra kalan tutara bir defaya mahsus{" "}
                    <strong>%{paymentInfo.financeChargeRate}</strong> uygulanır.
                  </p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <CalendarDays
                    className="size-6 text-red-600"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-black">Vade seçenekleri</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Güncel seçenekler:{" "}
                    <strong>
                      {paymentInfo.installmentCounts.join(", ")} ay
                    </strong>
                    .
                  </p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <CheckCircle2
                    className="size-6 text-red-600"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-black">Ödeme hazırlığı</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Başlangıçta ödeme zamanınızı seçersiniz:{" "}
                    <strong>{paymentInfo.timingOptions.join(", ")}</strong>.
                  </p>
                </article>
              </div>
              <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <AlertTriangle
                  className="mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <p>
                  Peşinatı seçtiğiniz zamanda ödemeye hazır değilseniz başvuruya
                  devam etmeyin. Başvurular ayrıca değerlendirilir; bu şartları
                  karşılamak kesin onay garantisi vermez.
                </p>
              </div>
            </>
          ) : (
            <div
              className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-800"
              role="alert"
            >
              Güncel ödeme koşulları şu anda görüntülenemiyor. Hatalı bilgi
              vermemek için ürün seçimine geçmeden önce lütfen daha sonra
              yeniden deneyin.
            </div>
          )}
        </Container>
      </section>

      {paymentInfo ? (
        <section className="bg-zinc-950 py-14 text-white sm:py-20">
          <Container>
            <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-6 sm:p-9 lg:p-12">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400">
                  Canlı ayarlardan örnek
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-4xl">
                  {paymentInfo.example.productPrice} ürün için ödeme planı
                </h2>
                <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
                  Bu örnek şu an aktif oranlarla otomatik hesaplanır. Seçtiğiniz
                  ürünün kesin planı ürün sayfasında ayrıca gösterilir.
                </p>
                <div className="mt-7 rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                    {paymentInfo.example.installmentCount} ay örnek ödeme
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                    {paymentInfo.example.monthlyInstallment}
                    <span className="text-base text-zinc-400">/ay</span>
                  </p>
                </div>
              </div>
              <dl className="border-t border-white/10 p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-12">
                {[
                  ["Ürün fiyatı", paymentInfo.example.productPrice],
                  [
                    `%${paymentInfo.example.downPaymentRate} peşinat`,
                    paymentInfo.example.downPayment,
                  ],
                  [
                    "Peşinat sonrası kalan",
                    paymentInfo.example.remainingPrincipal,
                  ],
                  [
                    `%${paymentInfo.financeChargeRate} vade farkı`,
                    paymentInfo.example.financeCharge,
                  ],
                  [
                    "Taksitlere bölünen toplam",
                    paymentInfo.example.financedTotal,
                  ],
                  [
                    "Peşinat dahil toplam ödeme",
                    paymentInfo.example.totalPayable,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-white/10 py-4 first:pt-0 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-zinc-400">{label}</dt>
                    <dd className="text-right text-sm font-black text-white sm:text-base">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              Örnek hesaplama teklif veya onay değildir. Ürün fiyatı ve aktif
              ayarlar değişirse tutarlar da değişir.
            </p>
          </Container>
        </section>
      ) : null}

      <section className="border-b border-zinc-200 bg-zinc-50 py-14 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Başvuruda gerekenler"
            title="Belgelerinizi önceden hazırlayın"
            description="Belgeler bu tanıtım sayfasında veya WhatsApp'ta toplanmaz. Ürünü seçtikten sonra yalnızca güvenli başvuru ekranına yüklenir."
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {documents.map((document) => {
              const Icon = document.icon;
              return (
                <article
                  key={document.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-zinc-950 text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-black">{document.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {document.description}
                  </p>
                </article>
              );
            })}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
            <UploadCloud
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <p>
              Kimlik ve ikametgâh belgelerinizi WhatsApp, sosyal medya veya bu
              sayfadaki herhangi bir alandan göndermeyin. Güvenli yükleme alanı
              yalnızca ürün seçimi sonrası açılan başvuru formundadır.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <SectionHeading
            eyebrow="Merak edilenler"
            title="Başvurmadan önce kısa cevaplar"
            description="Ekibe mesaj göndermeden önce en sık sorulan soruların yanıtlarını burada bulabilirsiniz."
          />
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {faqs.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-1 py-4 font-black text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                  {item.question}
                  <ChevronDown
                    className="size-5 shrink-0 text-zinc-400 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-1 pb-5 pr-8 text-sm leading-6 text-zinc-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-zinc-950 py-14 text-white sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-600">
              <ShoppingBag className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-400">
              Satın alma niyetiniz netse
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              Hazırsanız ürününüzü seçin
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Aşağıdaki maddeleri onayladıktan sonra kataloğa geçin. Ürün
              sayfasındaki gerçek ödeme planını görmeden başvuru tamamlanmaz.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6">
            <fieldset>
              <legend className="sr-only">
                Elden taksit başvuru hazırlık onayı
              </legend>
              <div className="space-y-3">
                {readinessItems.map((item, index) => {
                  const checked = confirmedItems.includes(index);
                  return (
                    <label
                      key={item}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/10 p-3 text-left transition hover:border-white/20"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setConfirmedItems((current) =>
                            event.target.checked
                              ? [...current, index]
                              : current.filter((value) => value !== index),
                          )
                        }
                        className="mt-0.5 size-5 shrink-0 accent-red-600"
                      />
                      <span className="text-sm font-semibold leading-6 text-zinc-200">
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {ready ? (
              <Link
                href="/urunler"
                onClick={() => trackLandingEvent("elden_taksit_products_click")}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Ürünleri İncele ve Seç
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-5 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-zinc-800 px-5 py-3 text-sm font-black text-zinc-500"
              >
                {paymentInfo
                  ? "Devam etmek için tüm maddeleri onaylayın"
                  : "Güncel ödeme koşulları yüklenemedi"}
              </button>
            )}
            <p className="mt-3 text-center text-[11px] leading-5 text-zinc-500">
              Bu buton başvuru oluşturmaz; ürün kataloğunu açar. Başvuru
              yalnızca seçtiğiniz ürünün sayfasından başlatılır.
            </p>
          </div>
        </Container>
      </section>
    </main>
  );
}
