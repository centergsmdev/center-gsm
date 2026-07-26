export function toMoney(value: number | string) {
  return Math.round(Number(value) * 100) / 100;
}
