export type PortalPaymentTimeRemaining = {
  expired: boolean;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function portalPaymentTimeRemaining(
  paymentDueAt: string,
  now = Date.now(),
): PortalPaymentTimeRemaining {
  const dueAt = new Date(paymentDueAt).getTime();
  const totalSeconds = Number.isFinite(dueAt)
    ? Math.max(0, Math.ceil((dueAt - now) / 1000))
    : 0;
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return {
    expired: totalSeconds === 0,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
  };
}
