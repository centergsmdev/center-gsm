"use client";

import { useMemo, useState } from "react";
import { CreditCard, HandCoins } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  calculatePaymentPlan,
  formatBasisPoints,
  formatMinorCurrency,
  liraToMinor,
  type PaymentPlanConfig,
  type PaymentPlanType,
} from "@/lib/payment-plan/engine";

export function PaymentOptionsCalculator({
  price,
  config,
  selectedInstallmentCount,
  onInstallmentCountChange,
}: {
  price: number;
  config: PaymentPlanConfig | null;
  selectedInstallmentCount: number;
  onInstallmentCountChange: (count: number) => void;
}) {
  const [paymentType, setPaymentType] =
    useState<PaymentPlanType>("credit_card");
  const [cardCount, setCardCount] = useState(
    config?.creditCardInstallmentCounts.at(-1) ?? 12,
  );
  const productPriceMinor = liraToMinor(price);
  const installmentPlan = useMemo(
    () =>
      config
        ? calculatePaymentPlan({
            paymentType: "installment_application",
            productPriceMinor,
            installmentCount: selectedInstallmentCount,
            config,
          })
        : null,
    [config, productPriceMinor, selectedInstallmentCount],
  );
  const cardPlan = useMemo(
    () =>
      config
        ? calculatePaymentPlan({
            paymentType: "credit_card",
            productPriceMinor,
            installmentCount: cardCount,
            config,
          })
        : null,
    [cardCount, config, productPriceMinor],
  );
  const plan = paymentType === "credit_card" ? cardPlan : installmentPlan;
  const counts =
    paymentType === "credit_card"
      ? config?.creditCardInstallmentCounts
      : config?.installmentCounts;

  return (
    <section
      aria-labelledby="payment-options-title"
      className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4"
    >
      <h2 id="payment-options-title" className="text-base font-black">
        Ödeme Seçenekleri
      </h2>
      {!config || !plan || !counts ? (
        <p className="mt-3 text-sm leading-6 text-zinc-600" role="status">
          Ödeme planları şu anda görüntülenemiyor.
        </p>
      ) : (
        <>
          <div
            className="mt-3 grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="Ödeme türü"
          >
            <PaymentTab
              selected={paymentType === "credit_card"}
              controls="credit-card-payment-plan"
              onClick={() => setPaymentType("credit_card")}
              icon={CreditCard}
            >
              Kredi Kartı
            </PaymentTab>
            <PaymentTab
              selected={paymentType === "installment_application"}
              controls="installment-application-payment-plan"
              onClick={() => setPaymentType("installment_application")}
              icon={HandCoins}
            >
              Elden Taksit
            </PaymentTab>
          </div>

          <div
            id={
              paymentType === "credit_card"
                ? "credit-card-payment-plan"
                : "installment-application-payment-plan"
            }
            role="tabpanel"
            className="mt-4"
          >
            <p className="text-sm font-bold text-zinc-950">
              {paymentType === "credit_card"
                ? "Peşin Fiyatına Taksit"
                : "Peşinatlı Elden Taksit"}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              {paymentType === "credit_card"
                ? "Peşinat ve vade farkı yoktur. Normal kredi kartı checkout akışı değişmez."
                : `Peşinat sonrası kalan tutara bir defa %${formatBasisPoints(plan.financeChargeRateBps)} vade farkı uygulanır.`}
            </p>

            {paymentType === "installment_application" ? (
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <AmountRow
                  label="Ürün fiyatı"
                  value={formatMinorCurrency(plan.productPriceMinor)}
                />
                <AmountRow
                  label={`Peşinat (%${formatBasisPoints(plan.downPaymentRateBps)})`}
                  value={formatMinorCurrency(plan.downPaymentAmountMinor)}
                />
                <AmountRow
                  label="Kalan ana tutar"
                  value={formatMinorCurrency(plan.remainingPrincipalMinor)}
                />
                <AmountRow
                  label={`Vade farkı (%${formatBasisPoints(plan.financeChargeRateBps)})`}
                  value={formatMinorCurrency(plan.financeChargeAmountMinor)}
                />
                <AmountRow
                  label="Taksitlendirilecek tutar"
                  value={formatMinorCurrency(plan.financedTotalMinor)}
                />
                <AmountRow
                  label="Toplam ödenecek"
                  value={formatMinorCurrency(plan.totalPayableMinor)}
                  strong
                />
              </dl>
            ) : (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm">
                <span className="text-zinc-600">Toplam ödeme</span>
                <strong className="float-right">
                  {formatMinorCurrency(plan.totalPayableMinor)}
                </strong>
              </div>
            )}

            <fieldset className="mt-4">
              <legend className="text-xs font-bold text-zinc-700">
                Taksit sayısı
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {counts.map((count) => {
                  const optionPlan = calculatePaymentPlan({
                    paymentType,
                    productPriceMinor,
                    installmentCount: count,
                    config,
                  });
                  const selected =
                    paymentType === "credit_card"
                      ? cardCount === count
                      : selectedInstallmentCount === count;
                  const last = optionPlan.installmentSchedule.at(-1);
                  const hasAdjustment =
                    last &&
                    last.amountMinor !== optionPlan.monthlyInstallmentMinor;
                  return (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        if (paymentType === "credit_card") setCardCount(count);
                        else onInstallmentCountChange(count);
                      }}
                      className={cn(
                        "min-w-0 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600",
                        selected
                          ? "border-red-600 bg-white shadow-sm"
                          : "border-zinc-200 bg-white/70 hover:border-zinc-400",
                      )}
                    >
                      <span className="block text-xs font-black">
                        {count} Ay
                      </span>
                      <span className="mt-1 block break-words text-xs font-semibold text-zinc-700">
                        {formatMinorCurrency(
                          optionPlan.monthlyInstallmentMinor,
                        )}{" "}
                        / ay
                      </span>
                      {hasAdjustment ? (
                        <span className="mt-1 block text-[10px] leading-4 text-zinc-500">
                          Son: {formatMinorCurrency(last.amountMinor)}
                        </span>
                      ) : null}
                      <span className="sr-only">
                        {selected ? "Seçili ödeme planı" : "Ödeme planını seç"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </>
      )}
    </section>
  );
}

function PaymentTab({
  selected,
  controls,
  onClick,
  icon: Icon,
  children,
}: {
  selected: boolean;
  controls: string;
  onClick: () => void;
  icon: typeof CreditCard;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600",
        selected
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-800",
      )}
    >
      <Icon className="size-4" aria-hidden="true" /> {children}
    </button>
  );
}

function AmountRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd
        className={cn("mt-1 break-words font-bold", strong && "text-red-700")}
      >
        {value}
      </dd>
    </div>
  );
}
