"use client";

import { useEffect, useState } from "react";
import {
  FileCheck2,
  Landmark,
  LoaderCircle,
  PhoneCall,
  Upload,
} from "lucide-react";

import { ChoiceCard } from "@/components/checkout/choice-card";
import { createClient } from "@/lib/supabase/client";
import { getDefaultPaymentAccount } from "@/payment/repository/payment-repository";
import type { PaymentAccount } from "@/payment/types";
import type { PaymentMethod } from "@/types/checkout";

export function PaymentMethods({
  value,
  onChange,
  errors,
  receiptFile,
  onReceiptFileChange,
  receiptError,
}: {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod) => void;
  errors: Record<string, string>;
  receiptFile: File | null;
  onReceiptFileChange: (file: File | null) => void;
  receiptError?: string;
}) {
  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTransferNotice, setShowTransferNotice] = useState(false);
  const [accountUpdated, setAccountUpdated] = useState(false);

  useEffect(() => {
    let active = true;
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    let updatedNoticeTimeout: ReturnType<typeof setTimeout> | undefined;

    const loadAccount = async (notify = false) => {
      const result = await getDefaultPaymentAccount();
      if (!active) return;
      setAccount(result.data);
      setError(result.error);
      setLoading(false);
      if (notify && !result.error) {
        setAccountUpdated(true);
        if (updatedNoticeTimeout) clearTimeout(updatedNoticeTimeout);
        updatedNoticeTimeout = setTimeout(() => {
          if (active) setAccountUpdated(false);
        }, 5000);
      }
    };

    void loadAccount();

    const client = createClient();
    const channel = client
      ?.channel("checkout-payment-accounts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_accounts",
        },
        () => {
          if (refreshTimeout) clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => void loadAccount(true), 200);
        },
      )
      .subscribe();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadAccount();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (updatedNoticeTimeout) clearTimeout(updatedNoticeTimeout);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (client && channel) void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!loading && !account && value === "transfer") {
      onChange("phone_approval");
    }
  }, [account, loading, onChange, value]);

  const transferUnavailable = !loading && !account;

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Ödeme yöntemi seçin</legend>
        <div className="grid gap-3">
          <ChoiceCard
            name="paymentMethod"
            value="transfer"
            checked={value === "transfer"}
            onChange={() => {
              onChange("transfer");
              setShowTransferNotice(true);
            }}
            disabled={transferUnavailable}
            title="Havale / EFT"
            description={
              transferUnavailable
                ? "Aktif banka hesabı tanımlanana kadar kullanılamaz"
                : "Sipariş numaranızla banka hesabımıza güvenli transfer"
            }
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
      {errors.paymentMethod ? (
        <p className="mt-2 text-xs font-semibold text-danger" role="alert">
          {errors.paymentMethod}
        </p>
      ) : null}

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
              {accountUpdated ? (
                <p
                  className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"
                  role="status"
                >
                  Banka bilgileri güncellendi. Lütfen ödemede aşağıdaki güncel
                  hesabı kullanın.
                </p>
              ) : null}
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

              <div className="mt-5 border-t border-border pt-4">
                <label
                  className="block text-xs font-black"
                  htmlFor="paymentReceipt"
                >
                  Ödeme dekontu
                </label>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Dekontun ekran görüntüsünü veya PDF dosyasını yükleyin. En
                  fazla 10 MB.
                </p>
                <label
                  htmlFor="paymentReceipt"
                  className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white px-4 text-sm font-bold transition hover:border-primary hover:text-primary"
                >
                  {receiptFile ? (
                    <FileCheck2 className="size-4 text-emerald-600" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  <span className="min-w-0 truncate">
                    {receiptFile ? receiptFile.name : "Dekont yükle"}
                  </span>
                </label>
                <input
                  id="paymentReceipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(event) =>
                    onReceiptFileChange(event.target.files?.[0] ?? null)
                  }
                />
                {receiptError ? (
                  <p
                    className="mt-2 text-xs font-semibold text-danger"
                    role="alert"
                  >
                    {receiptError}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-xs font-semibold text-amber-800">
              {error
                ? "Banka bilgileri yüklenemedi."
                : "Aktif banka hesabı henüz tanımlanmadı."}
            </p>
          )}
        </div>
      ) : value === "phone_approval" ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          <strong className="block">Telefon ile güvenli onay</strong>
          <span className="mt-1 block">
            Sipariş oluşturulduktan sonra kayıtlı telefonunuzdan aranırsınız.
            Hassas ödeme verileri bu sitede toplanmaz.
          </span>
        </div>
      ) : null}

      {showTransferNotice ? (
        <div
          className="fixed inset-0 z-modal grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-notice-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="transfer-notice-title" className="text-lg font-black">
              Havale / EFT bilgilendirmesi
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Lütfen ödeme işlemini sağlayıp dekontu yükleyiniz.
            </p>
            <button
              type="button"
              onClick={() => setShowTransferNotice(false)}
              className="mt-5 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-black text-white"
            >
              Tamam
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
