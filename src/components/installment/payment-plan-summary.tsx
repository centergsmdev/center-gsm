import { HandCoins } from "lucide-react";

import {
  formatBasisPoints,
  formatMinorCurrency,
  type PaymentPlan,
} from "@/lib/payment-plan/engine";

export function PaymentPlanSummary({
  plan,
  title = "Seçtiğiniz Ödeme Planı",
}: {
  plan: PaymentPlan;
  title?: string;
}) {
  const last = plan.installmentSchedule.at(-1);
  const adjusted = last && last.amountMinor !== plan.monthlyInstallmentMinor;
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-4 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-sm shadow-red-950/20">
          <HandCoins className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-black text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Ayar revizyonu {plan.configRevision}
          </p>
        </div>
      </div>
      <dl className="grid gap-x-5 px-4 py-3 text-sm sm:grid-cols-2 sm:px-5">
        <PlanRow label="Ürün fiyatı" value={plan.productPriceMinor} />
        <PlanRow
          label={`Peşinat (%${formatBasisPoints(plan.downPaymentRateBps)})`}
          value={plan.downPaymentAmountMinor}
        />
        <PlanRow label="Kalan ana tutar" value={plan.remainingPrincipalMinor} />
        <PlanRow
          label={`Vade farkı (%${formatBasisPoints(plan.financeChargeRateBps)})`}
          value={plan.financeChargeAmountMinor}
        />
        <PlanRow
          label="Taksitlendirilecek tutar"
          value={plan.financedTotalMinor}
        />
        <PlanRow label="Taksit sayısı" text={`${plan.installmentCount} Ay`} />
        <PlanRow label="Aylık ödeme" value={plan.monthlyInstallmentMinor} />
        {adjusted ? (
          <PlanRow label="Son taksit" value={last.amountMinor} />
        ) : null}
        <PlanRow
          label="Toplam ödenecek"
          value={plan.totalPayableMinor}
          strong
        />
      </dl>
      <ol className="grid gap-2 border-t border-zinc-200 bg-zinc-50 p-4 text-xs sm:grid-cols-2 sm:p-5">
        {plan.installmentSchedule.map((item) => (
          <li
            key={item.installment}
            className="flex min-w-0 justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <span>{item.installment}. taksit</span>
            <strong className="break-words text-right">
              {formatMinorCurrency(item.amountMinor)}
            </strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlanRow({
  label,
  value,
  text,
  strong = false,
}: {
  label: string;
  value?: number;
  text?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-zinc-100 py-2.5">
      <dt className="text-zinc-600">{label}</dt>
      <dd
        className={`break-words text-right font-bold ${strong ? "text-red-700" : "text-zinc-950"}`}
      >
        {text ?? formatMinorCurrency(value ?? 0)}
      </dd>
    </div>
  );
}
