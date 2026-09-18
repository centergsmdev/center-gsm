import { InstallmentLanding } from "@/components/installment/installment-landing";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getInstallmentServiceClient } from "@/lib/installment/server";
import {
  calculatePaymentPlan,
  formatBasisPoints,
  formatMinorCurrency,
} from "@/lib/payment-plan/engine";
import { getActivePaymentPlanConfig } from "@/lib/payment-plan/server";
import { generateSeoMetadata } from "@/lib/seo/seo";
import { getSiteSettings } from "@/lib/settings/site-settings";

export const revalidate = 300;

export const metadata = generateSeoMetadata({
  title: "Elden Taksit | CENTER GSM",
  description:
    "CENTER GSM elden taksit başvuru sürecini, güncel ödeme koşullarını, gerekli belgeleri ve başvuru adımlarını inceleyin.",
  canonical: "/elden-taksit",
});

function safeVideoUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function InstallmentLandingPage() {
  const service = getInstallmentServiceClient();
  const [settings, config] = await Promise.all([
    getSiteSettings(),
    service ? getActivePaymentPlanConfig(service) : Promise.resolve(null),
  ]);

  const examplePriceMinor = 60_000_00;
  const exampleInstallmentCount = config
    ? Math.max(...config.installmentCounts)
    : 12;
  const examplePlan = config
    ? calculatePaymentPlan({
        paymentType: "installment_application",
        productPriceMinor: examplePriceMinor,
        installmentCount: exampleInstallmentCount,
        config,
      })
    : null;

  const paymentInfo =
    config && examplePlan
      ? {
          threshold: formatMinorCurrency(config.thresholdMinor),
          aboveThresholdRate: formatBasisPoints(
            config.aboveThresholdDownPaymentBps,
          ),
          belowThresholdRate: formatBasisPoints(
            config.belowThresholdDownPaymentBps,
          ),
          financeChargeRate: formatBasisPoints(
            config.installmentFinanceChargeBps,
          ),
          installmentCounts: config.installmentCounts,
          timingOptions: config.downPaymentTimingOptions.map(
            (option) => option.label,
          ),
          example: {
            productPrice: formatMinorCurrency(examplePlan.productPriceMinor),
            downPaymentRate: formatBasisPoints(examplePlan.downPaymentRateBps),
            downPayment: formatMinorCurrency(
              examplePlan.downPaymentAmountMinor,
            ),
            remainingPrincipal: formatMinorCurrency(
              examplePlan.remainingPrincipalMinor,
            ),
            financeCharge: formatMinorCurrency(
              examplePlan.financeChargeAmountMinor,
            ),
            financedTotal: formatMinorCurrency(examplePlan.financedTotalMinor),
            installmentCount: examplePlan.installmentCount,
            monthlyInstallment: formatMinorCurrency(
              examplePlan.monthlyInstallmentMinor,
            ),
            totalPayable: formatMinorCurrency(examplePlan.totalPayableMinor),
          },
        }
      : null;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <Header />
      <InstallmentLanding
        videoUrl={safeVideoUrl(settings.installment_landing_video_url)}
        paymentInfo={paymentInfo}
      />
      <Footer />
    </div>
  );
}
