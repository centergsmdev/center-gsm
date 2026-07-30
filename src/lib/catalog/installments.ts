export const INSTALLMENT_COUNTS = [2, 3, 4, 5, 6, 9, 12, 18, 24, 36] as const;

export function isInstallmentCount(value: number) {
  return INSTALLMENT_COUNTS.some((count) => count === value);
}

export function calculateMonthlyInstallment(price: number, count: number) {
  if (!Number.isFinite(price) || price < 0 || !isInstallmentCount(count))
    return 0;
  return Math.floor(price / count);
}
