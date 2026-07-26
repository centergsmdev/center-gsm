"use client";
import { useEffect, useState } from "react";
import { Landmark, LoaderCircle, PhoneCall } from "lucide-react";
import { ChoiceCard } from "@/components/checkout/choice-card";
import { getDefaultPaymentAccount } from "@/payment/repository/payment-repository";
import type { PaymentAccount } from "@/payment/types";
import type { PaymentMethod } from "@/types/checkout";

export function PaymentMethods({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  errors: Record<string, string>;
}) {
  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void getDefaultPaymentAccount().then((result) => {
      if (!active) return;
      setAccount(result.data);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div>
      <fieldset>
        <legend className="sr-only">Ödeme yöntemi seçin</legend>
        <div className="grid gap-3">
          <ChoiceCard
            name="paymentMethod"
            value="transfer"
            checked={value === "transfer"}
            onChange={() => onChange("transfer")}
            title="Havale / EFT"
            description="Sipariş numaranızla banka hesabımıza güvenli transfer"
            icon={<Landmark className="size-5" aria-hidden="true" />}
          />
          <ChoiceCard
            name="paymentMethod"
            value="phone_approval"
            checked={value === "phone_approval"}
            onChange={() => onChange("phone_approval")}
            title="Online Kart ile Öde (Telefon ile Onay)"
            description="Ekibimiz sizi telefonla arar; kart bilgisi bu sitede istenmez"
            icon={<PhoneCall className="size-5" aria-hidden="true" />}
          />
        </div>
      </fieldset>
      {value === "transfer" ? (
        <div
          className="mt-5 rounded-lg border border-border bg-surface-subtle p-4 sm:p-5"
          aria-live="polite"
        >
          {loading ? (
            <p className="flex items-center gap-2 text-xs font-bold text-muted">
              <LoaderCircle className="size-4 animate-spin" />
              Banka hesabı yükleniyor…
            </p>
          ) : account ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Varsayılan banka hesabı
              </p>
              <p className="mt-2 font-black">{account.bankName}</p>
              <p className="mt-1 text-sm text-muted">{account.accountHolder}</p>
              <p className="mt-3 break-all font-mono text-sm font-bold">
                {account.iban.replace(/(.{4})/g, "$1 ").trim()}
              </p>
              {account.branch ? (
                <p className="mt-2 text-xs text-muted">
                  Şube: {account.branch}
                </p>
              ) : null}
              {account.description ? (
                <p className="mt-2 text-xs text-muted">{account.description}</p>
              ) : null}
            </>
          ) : (
            <p className="text-xs font-semibold text-amber-800">
              {error
                ? "Banka bilgileri yüklenemedi."
                : "Aktif banka hesabı henüz tanımlanmadı."}
            </p>
          )}
        </div>
      ) : <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><strong className="block">Telefon ile güvenli onay</strong><span className="mt-1 block">Sipariş oluşturulduktan sonra kayıtlı telefonunuzdan aranırsınız. Hassas ödeme verileri bu sitede toplanmaz.</span></div>}
    </div>
  );
}
