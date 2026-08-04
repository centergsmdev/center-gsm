"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { getMyCredits, validateGiftCard } from "@/lib/credits";
export type CreditSelection = {
  giftCode: string;
  giftAmount: number;
  storeCreditAmount: number;
};
export function CreditPaymentInput({
  remaining,
  onChange,
}: {
  remaining: number;
  onChange: (v: CreditSelection) => void;
}) {
  const [giftCode, setGiftCode] = useState(""),
    [giftAmount, setGiftAmount] = useState(0),
    [storeBalance, setStoreBalance] = useState(0),
    [storeAmount, setStoreAmount] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    void getMyCredits().then((r) =>
      setStoreBalance(r.data?.account?.balance ?? 0),
    );
  }, []);
  function emit(next: Partial<CreditSelection>) {
    onChange({
      giftCode,
      giftAmount,
      storeCreditAmount: Number(storeAmount) || 0,
      ...next,
    });
  }
  async function applyGift() {
    const r = await validateGiftCard(giftCode);
    if (!r.data?.valid) {
      setGiftAmount(0);
      setMessage("Hediye kartı geçersiz veya kullanılamıyor.");
      emit({ giftCode: "", giftAmount: 0 });
      return;
    }
    const amount = Math.min(remaining, r.data.balance ?? 0);
    setGiftAmount(amount);
    setMessage(
      `${r.data.title ?? "Hediye kartı"} · ${formatCurrency(amount)} uygulanacak.`,
    );
    emit({ giftCode: giftCode.trim().toUpperCase(), giftAmount: amount });
  }
  function applyCredit() {
    const requested = Number(storeAmount);
    const limit = Math.min(storeBalance, Math.max(0, remaining - giftAmount));
    if (!Number.isFinite(requested) || requested <= 0 || requested > limit) {
      setMessage(
        `En fazla ${formatCurrency(limit)} mağaza bakiyesi kullanabilirsiniz.`,
      );
      emit({ storeCreditAmount: 0 });
      return;
    }
    setMessage(`${formatCurrency(requested)} mağaza bakiyesi uygulanacak.`);
    emit({ storeCreditAmount: requested });
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <label
          htmlFor="checkout-gift-card-code"
          className="mb-2 block text-sm font-black"
        >
          Gift Card Kodu
        </label>
        <div className="flex min-w-0 gap-2">
          <Input
            id="checkout-gift-card-code"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
            placeholder="CG-XXXX"
            autoComplete="off"
            className="min-w-0 flex-1"
          />
          <Button
            className="shrink-0"
            type="button"
            variant="outline"
            onClick={() => void applyGift()}
          >
            Doğrula
          </Button>
        </div>
        {giftAmount ? (
          <p className="mt-2 text-xs font-bold text-emerald-700">
            −{formatCurrency(giftAmount)}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="checkout-store-credit-amount"
          className="mb-2 block text-sm font-black"
        >
          Store Credit Kullan
        </label>
        <p className="mb-2 text-xs text-muted">
          Bakiyeniz: {formatCurrency(storeBalance)}
        </p>
        <div className="flex min-w-0 gap-2">
          <Input
            id="checkout-store-credit-amount"
            type="number"
            min={0}
            max={storeBalance}
            value={storeAmount}
            onChange={(e) => setStoreAmount(e.target.value)}
            placeholder="Tutar"
            className="min-w-0 flex-1"
          />
          <Button
            className="shrink-0"
            type="button"
            variant="outline"
            disabled={!storeBalance}
            onClick={applyCredit}
          >
            Uygula
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted md:col-span-2" aria-live="polite">
        {message ||
          "Bakiyeler sipariş oluşturulurken sunucuda yeniden doğrulanır."}
      </p>
    </div>
  );
}
