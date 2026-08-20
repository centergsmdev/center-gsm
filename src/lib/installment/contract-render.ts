export const INSTALLMENT_CONTRACT_PLACEHOLDERS = [
  "customer_name",
  "product_name",
  "variant_name",
  "product_price",
  "application_date",
] as const;

export type InstallmentContractPlaceholder =
  (typeof INSTALLMENT_CONTRACT_PLACEHOLDERS)[number];

export type InstallmentContractValues = Record<
  InstallmentContractPlaceholder,
  string
>;

const PLACEHOLDER_PATTERN = /{{\s*([a-z_]+)\s*}}/g;

export function escapeInstallmentContractValue(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderInstallmentContract(
  contentHtml: string,
  values: InstallmentContractValues,
) {
  return contentHtml.replace(PLACEHOLDER_PATTERN, (_match, key: string) =>
    escapeInstallmentContractValue(
      values[key as InstallmentContractPlaceholder] ?? "—",
    ),
  );
}

export function installmentContractAcceptanceIsValid(value: unknown) {
  return value === true;
}
