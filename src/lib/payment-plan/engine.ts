export const DEFAULT_INSTALLMENT_COUNTS = [3, 6, 9, 12] as const;

export type PaymentPlanType = "installment_application" | "credit_card";

export type PaymentPlanConfig = {
  id: string;
  revision: number;
  thresholdMinor: number;
  aboveThresholdDownPaymentBps: number;
  belowThresholdDownPaymentBps: number;
  installmentFinanceChargeBps: number;
  installmentCounts: number[];
  creditCardFinanceChargeBps: number;
  creditCardInstallmentCounts: number[];
  createdAt: string;
};

export type PaymentScheduleItem = {
  installment: number;
  amountMinor: number;
};

export type PaymentPlan = {
  paymentType: PaymentPlanType;
  configId: string;
  configRevision: number;
  productPriceMinor: number;
  thresholdMinor: number;
  downPaymentRateBps: number;
  downPaymentAmountMinor: number;
  remainingPrincipalMinor: number;
  financeChargeRateBps: number;
  financeChargeAmountMinor: number;
  financedTotalMinor: number;
  installmentCount: number;
  monthlyInstallmentMinor: number;
  installmentSchedule: PaymentScheduleItem[];
  totalPayableMinor: number;
};

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function assertSafeNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${label}_invalid`);
}

export function liraToMinor(value: number | string) {
  const normalized =
    typeof value === "number"
      ? Number.isFinite(value)
        ? value.toFixed(2)
        : ""
      : value.trim().replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new RangeError("money_invalid");
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const minor = whole * 100 + fraction;
  assertSafeNonNegativeInteger(minor, "money");
  return minor;
}

export function minorToLira(value: number) {
  assertSafeNonNegativeInteger(value, "money");
  return value / 100;
}

export function formatMinorCurrency(value: number) {
  return moneyFormatter.format(minorToLira(value));
}

export function formatBasisPoints(value: number) {
  assertSafeNonNegativeInteger(value, "rate");
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: value % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function calculateRateAmount(amountMinor: number, rateBps: number) {
  assertSafeNonNegativeInteger(amountMinor, "amount");
  assertSafeNonNegativeInteger(rateBps, "rate");
  if (rateBps > 10_000) throw new RangeError("rate_invalid");
  const wholeUnits = Math.floor(amountMinor / 10_000);
  const remainder = amountMinor % 10_000;
  const result =
    wholeUnits * rateBps + Math.floor((remainder * rateBps + 5_000) / 10_000);
  assertSafeNonNegativeInteger(result, "money");
  return result;
}

export function createInstallmentSchedule(
  financedTotalMinor: number,
  installmentCount: number,
) {
  assertSafeNonNegativeInteger(financedTotalMinor, "financed_total");
  if (
    !Number.isSafeInteger(installmentCount) ||
    installmentCount < 1 ||
    installmentCount > 36
  )
    throw new RangeError("installment_count_invalid");
  const regularAmount = Math.floor(financedTotalMinor / installmentCount);
  const lastAmount =
    financedTotalMinor - regularAmount * (installmentCount - 1);
  return Array.from({ length: installmentCount }, (_, index) => ({
    installment: index + 1,
    amountMinor: index === installmentCount - 1 ? lastAmount : regularAmount,
  }));
}

export function paymentScheduleTotal(schedule: PaymentScheduleItem[]) {
  return schedule.reduce((total, item) => total + item.amountMinor, 0);
}

export function calculatePaymentPlan(input: {
  paymentType: PaymentPlanType;
  productPriceMinor: number;
  installmentCount: number;
  config: PaymentPlanConfig;
}): PaymentPlan {
  const { paymentType, productPriceMinor, installmentCount, config } = input;
  assertSafeNonNegativeInteger(productPriceMinor, "product_price");
  assertSafeNonNegativeInteger(config.thresholdMinor, "threshold");
  const allowedCounts =
    paymentType === "installment_application"
      ? config.installmentCounts
      : config.creditCardInstallmentCounts;
  if (!allowedCounts.includes(installmentCount))
    throw new RangeError("installment_count_not_allowed");

  const downPaymentRateBps =
    paymentType === "installment_application"
      ? productPriceMinor >= config.thresholdMinor
        ? config.aboveThresholdDownPaymentBps
        : config.belowThresholdDownPaymentBps
      : 0;
  const financeChargeRateBps =
    paymentType === "installment_application"
      ? config.installmentFinanceChargeBps
      : 0;
  const downPaymentAmountMinor = calculateRateAmount(
    productPriceMinor,
    downPaymentRateBps,
  );
  const remainingPrincipalMinor = productPriceMinor - downPaymentAmountMinor;
  const financeChargeAmountMinor = calculateRateAmount(
    remainingPrincipalMinor,
    financeChargeRateBps,
  );
  const financedTotalMinor = remainingPrincipalMinor + financeChargeAmountMinor;
  const installmentSchedule = createInstallmentSchedule(
    financedTotalMinor,
    installmentCount,
  );

  return {
    paymentType,
    configId: config.id,
    configRevision: config.revision,
    productPriceMinor,
    thresholdMinor: config.thresholdMinor,
    downPaymentRateBps,
    downPaymentAmountMinor,
    remainingPrincipalMinor,
    financeChargeRateBps,
    financeChargeAmountMinor,
    financedTotalMinor,
    installmentCount,
    monthlyInstallmentMinor: installmentSchedule[0]?.amountMinor ?? 0,
    installmentSchedule,
    totalPayableMinor: downPaymentAmountMinor + financedTotalMinor,
  };
}

export function validatePaymentPlanConfig(input: PaymentPlanConfig) {
  const rates = [
    input.aboveThresholdDownPaymentBps,
    input.belowThresholdDownPaymentBps,
    input.installmentFinanceChargeBps,
    input.creditCardFinanceChargeBps,
  ];
  if (
    !Number.isSafeInteger(input.revision) ||
    input.revision < 1 ||
    !Number.isSafeInteger(input.thresholdMinor) ||
    input.thresholdMinor < 0 ||
    input.creditCardFinanceChargeBps !== 0 ||
    rates.some(
      (rate) => !Number.isSafeInteger(rate) || rate < 0 || rate > 10_000,
    ) ||
    !validInstallmentCounts(input.installmentCounts) ||
    !validInstallmentCounts(input.creditCardInstallmentCounts)
  )
    return false;
  return true;
}

export function validInstallmentCounts(values: number[]) {
  return (
    values.length >= 1 &&
    values.length <= 12 &&
    new Set(values).size === values.length &&
    values.every(
      (value) => Number.isSafeInteger(value) && value >= 1 && value <= 36,
    )
  );
}

export function normalizeInstallmentCounts(values: unknown) {
  if (!Array.isArray(values)) return null;
  const counts = values.map(Number).sort((a, b) => a - b);
  return validInstallmentCounts(counts) ? counts : null;
}

export function describePaymentSchedule(schedule: PaymentScheduleItem[]) {
  return schedule
    .map(
      (item) =>
        `${item.installment}. taksit: ${formatMinorCurrency(item.amountMinor)}`,
    )
    .join(" · ");
}
