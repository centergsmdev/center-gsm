"use client";

import { useState } from "react";
import { TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/providers/cart-provider";

export function CouponForm({ embedded = false }: { embedded?: boolean }) {
  const { applyCoupon, couponCode, promotionLoading, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">(
    couponCode ? "success" : "idle",
  );

  const submitCoupon = async () => {
    const result = await applyCoupon(code);
    setStatus(result.success ? "success" : "error");
    setMessage(result.error ?? "");
  };

  const content = (
    <>
      <label
        htmlFor="coupon-code"
        className="flex items-center gap-2 text-sm font-bold"
      >
        <TicketPercent className="size-4 text-primary" aria-hidden="true" />
        Kupon kodu
      </label>
      <div className="mt-3 flex min-w-0 gap-2">
        <Input
          id="coupon-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Kupon kodunu yazın"
          autoComplete="off"
          invalid={status === "error"}
          className="min-w-0 flex-1"
        />
        <Button
          className="shrink-0"
          type={embedded ? "button" : "submit"}
          variant="outline"
          disabled={promotionLoading}
          onClick={embedded ? () => void submitCoupon() : undefined}
        >
          {promotionLoading ? "Doğrulanıyor…" : "Uygula"}
        </Button>
      </div>
      <p
        className={`mt-2 text-xs ${status === "error" ? "text-danger" : status === "success" ? "text-success" : "text-muted"}`}
        aria-live="polite"
      >
        {status === "success"
          ? `${couponCode ?? code.toUpperCase()} kuponu uygulandı.`
          : status === "error"
            ? message
            : "Kuponunuz güvenli şekilde doğrulanacaktır."}
      </p>
      {couponCode ? (
        <button
          type="button"
          onClick={() => {
            removeCoupon();
            setStatus("idle");
            setCode("");
          }}
          className="mt-2 text-xs font-bold text-primary"
        >
          Kuponu kaldır
        </button>
      ) : null}
    </>
  );

  if (embedded) return <div>{content}</div>;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitCoupon();
      }}
    >
      {content}
    </form>
  );
}
