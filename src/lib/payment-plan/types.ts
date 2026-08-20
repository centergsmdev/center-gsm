import type { PaymentPlan, PaymentPlanConfig } from "./engine";

export type PaymentPlanOffer = {
  config: PaymentPlanConfig;
  plan: PaymentPlan;
  presentedAt: string;
  offerToken: string;
};

export type PaymentPlanConfigInput = {
  thresholdMinor: number;
  aboveThresholdDownPaymentBps: number;
  belowThresholdDownPaymentBps: number;
  installmentFinanceChargeBps: number;
  installmentCounts: number[];
  creditCardFinanceChargeBps: number;
  creditCardInstallmentCounts: number[];
};
