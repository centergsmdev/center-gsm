"use client";

import type { InvoiceType } from "@/types/checkout";
import {
  CheckoutField,
  CheckoutTextarea,
} from "@/components/checkout/checkout-field";

export function InvoiceForm({
  invoiceType,
  setInvoiceType,
  sameAddress,
  setSameAddress,
  errors,
}: {
  invoiceType: InvoiceType;
  setInvoiceType: (value: InvoiceType) => void;
  sameAddress: boolean;
  setSameAddress: (value: boolean) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle p-4 text-sm font-semibold">
        <input
          type="checkbox"
          name="sameAddress"
          checked={sameAddress}
          onChange={(event) => setSameAddress(event.target.checked)}
          className="mt-0.5 size-4 accent-red-700"
        />
        Fatura adresim teslimat adresimle aynı
      </label>
      <fieldset className="mt-5">
        <legend className="text-xs font-bold text-zinc-700">Fatura türü</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["individual", "corporate"] as const).map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-lg border p-4 text-sm font-bold transition-all ${invoiceType === value ? "border-zinc-950 bg-zinc-950 text-white shadow-sm" : "border-border hover:border-border-strong"}`}
            >
              <input
                type="radio"
                name="invoiceType"
                value={value}
                checked={invoiceType === value}
                onChange={() => setInvoiceType(value)}
                className="sr-only"
              />
              {value === "individual" ? "Bireysel" : "Kurumsal"}
            </label>
          ))}
        </div>
      </fieldset>
      {invoiceType === "individual" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CheckoutField
            label="T.C. kimlik numarası"
            name="identityNumber"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            required
            error={errors.identityNumber}
            className="sm:col-span-2"
          />
          <CheckoutField
            label="Fatura adı"
            name="invoiceFirstName"
            autoComplete="billing given-name"
            required
            error={errors.invoiceFirstName}
          />
          <CheckoutField
            label="Fatura soyadı"
            name="invoiceLastName"
            autoComplete="billing family-name"
            required
            error={errors.invoiceLastName}
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CheckoutField
            label="Firma unvanı"
            name="companyName"
            autoComplete="organization"
            required
            error={errors.companyName}
            className="sm:col-span-2"
          />
          <CheckoutField
            label="Vergi dairesi"
            name="taxOffice"
            autoComplete="off"
            required
            error={errors.taxOffice}
          />
          <CheckoutField
            label="Vergi numarası"
            name="taxNumber"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            required
            error={errors.taxNumber}
          />
          <CheckoutTextarea
            label="Firma adresi"
            name="companyAddress"
            autoComplete="billing street-address"
            required
            error={errors.companyAddress}
            className="sm:col-span-2"
          />
        </div>
      )}
    </div>
  );
}
