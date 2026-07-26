"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, PackageSearch } from "lucide-react";

import { OrderNotFound } from "@/components/order-tracking/order-not-found";
import { CheckoutField } from "@/components/checkout/checkout-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrderByReference } from "@/lib/orders/client";

export function OrderTrackingForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const orderNumber = String(data.get("orderNumber") ?? "")
      .trim()
      .toUpperCase();
    const contact = String(data.get("contact") ?? "")
      .trim()
      .toLocaleLowerCase("tr-TR");
    const next: Record<string, string> = {};
    if (!orderNumber) next.orderNumber = "Sipariş numarasını girin.";
    if (!contact) next.contact = "E-posta veya telefon bilginizi girin.";
    setErrors(next);
    setNotFound(false);
    if (Object.keys(next).length) return;
    setLoading(true);
    const result = await getOrderByReference(orderNumber, contact);
    if (result.data) {
      window.sessionStorage.setItem(
        "center-gsm-order-access",
        JSON.stringify({ orderNumber, contact }),
      );
      router.push(`/siparis/${encodeURIComponent(orderNumber)}`);
    } else {
      setLoading(false);
      setNotFound(true);
    }
  }
  return (
    <Card className="mx-auto max-w-xl p-5 shadow-md sm:p-8">
      <div className="flex gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
          <PackageSearch className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black">Siparişinizi sorgulayın</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Sipariş sırasında kullandığınız iletişim bilgisini girin.
          </p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <CheckoutField
          label="Sipariş numarası"
          name="orderNumber"
          placeholder="CG-2026-482731"
          autoComplete="off"
          error={errors.orderNumber}
          required
        />
        <CheckoutField
          label="E-posta veya telefon"
          name="contact"
          placeholder="demo@centergsm.com"
          autoComplete="email"
          error={errors.contact}
          required
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <PackageSearch className="size-4" aria-hidden="true" />
          )}
          {loading ? "Sipariş aranıyor…" : "Siparişi Sorgula"}
          {!loading ? (
            <ArrowRight className="size-4" aria-hidden="true" />
          ) : null}
        </Button>
      </form>
      {notFound ? <OrderNotFound /> : null}
    </Card>
  );
}
