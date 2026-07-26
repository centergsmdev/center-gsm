"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole } from "lucide-react";

import { CheckoutSection } from "@/components/checkout/checkout-section";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { DeliveryAddressForm } from "@/components/checkout/delivery-address-form";
import {
  DeliveryMethods,
  deliveryOptions,
} from "@/components/checkout/delivery-methods";
import { InvoiceForm } from "@/components/checkout/invoice-form";
import { PaymentMethods } from "@/components/checkout/payment-methods";
import { CouponForm } from "@/components/cart/coupon-form";
import { LoyaltyPointsInput } from "@/components/checkout/loyalty-points-input";
import {
  CreditPaymentInput,
  type CreditSelection,
} from "@/components/checkout/credit-payment-input";
import {
  ShippingCarrierSelection,
  fallbackCheckoutCarriers,
  type CheckoutCarrier,
} from "@/components/checkout/shipping-carrier-selection";
import { Button } from "@/components/ui/button";
import { useCart } from "@/providers/cart-provider";
import { createOrder } from "@/lib/orders/client";
import { fallbackSkus } from "@/lib/catalog/fallback-skus";
import { getActiveShippingCarriers } from "@/shipping/repository/shipping-repository";
import type {
  DeliveryMethod,
  DemoOrder,
  InvoiceType,
  PaymentMethod,
} from "@/types/checkout";

const requiredFields: Record<string, string> = {
  firstName: "Adınızı girin.",
  lastName: "Soyadınızı girin.",
  phone: "Telefon numaranızı girin.",
  email: "E-posta adresinizi girin.",
  city: "İl seçin.",
  district: "İlçe seçin.",
  neighborhood: "Mahalle bilgisini girin.",
  address: "Açık adresinizi girin.",
  postalCode: "Posta kodunu girin.",
  addressTitle: "Adres başlığını girin.",
};
export function CheckoutForm() {
  const router = useRouter();
  const { lines, couponCode, clearCart, totals } = useCart();
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [credits, setCredits] = useState<CreditSelection>({
    giftCode: "",
    giftAmount: 0,
    storeCreditAmount: 0,
  });
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("individual");
  const [sameAddress, setSameAddress] = useState(true);
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [carriers, setCarriers] = useState<CheckoutCarrier[]>(
    fallbackCheckoutCarriers,
  );
  const [selectedCarrier, setSelectedCarrier] = useState("yurtici");
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (lines.length === 0 && !processing) router.replace("/sepet");
  }, [lines.length, processing, router]);

  useEffect(() => {
    void getActiveShippingCarriers().then((result) => {
      const supported = result.data
        ?.filter((item) =>
          ["yurtici", "mng", "aras", "surat", "ptt", "hepsijet"].includes(
            item.provider_key,
          ),
        )
        .map((item) => ({
          providerKey: item.provider_key,
          name: item.name,
          estimatedDays: item.estimated_delivery_days,
          freeLabel: item.free_shipping_label,
          description:
            item.customer_description ?? "Türkiye geneli güvenli teslimat",
          logoUrl: item.logo_url,
        }));
      if (supported?.length) {
        setCarriers(supported);
        const defaultRow = result.data?.find(
          (item) =>
            item.is_default &&
            supported.some(
              (carrier) => carrier.providerKey === item.provider_key,
            ),
        );
        setSelectedCarrier(
          defaultRow?.provider_key ?? supported[0].providerKey,
        );
      }
      setCarriersLoading(false);
    });
  }, []);

  function validate(formData: FormData) {
    const next: Record<string, string> = {};
    for (const [name, message] of Object.entries(requiredFields))
      if (!String(formData.get(name) ?? "").trim()) next[name] = message;
    if (!/^\S+@\S+\.\S+$/.test(String(formData.get("email") ?? "")))
      next.email = "Geçerli bir e-posta adresi girin.";
    if (String(formData.get("phone") ?? "").replace(/\D/g, "").length < 10)
      next.phone = "Geçerli bir telefon numarası girin.";
    if (!/^\d{5}$/.test(String(formData.get("postalCode") ?? "")))
      next.postalCode = "Posta kodu 5 rakam olmalıdır.";
    if (invoiceType === "individual") {
      if (!/^\d{11}$/.test(String(formData.get("identityNumber") ?? "")))
        next.identityNumber = "T.C. kimlik numarası 11 rakam olmalıdır.";
      if (!String(formData.get("invoiceFirstName") ?? "").trim())
        next.invoiceFirstName = "Fatura adını girin.";
      if (!String(formData.get("invoiceLastName") ?? "").trim())
        next.invoiceLastName = "Fatura soyadını girin.";
    } else {
      if (!String(formData.get("companyName") ?? "").trim())
        next.companyName = "Firma unvanını girin.";
      if (!String(formData.get("taxOffice") ?? "").trim())
        next.taxOffice = "Vergi dairesini girin.";
      if (!/^\d{10}$/.test(String(formData.get("taxNumber") ?? "")))
        next.taxNumber = "Vergi numarası 10 rakam olmalıdır.";
      if (!String(formData.get("companyAddress") ?? "").trim())
        next.companyAddress = "Firma adresini girin.";
    }
    if (!formData.get("distanceAgreement"))
      next.distanceAgreement = "Mesafeli satış sözleşmesini onaylayın.";
    if (!formData.get("preInformation"))
      next.preInformation = "Ön bilgilendirme formunu onaylayın.";
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextErrors = validate(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.setTimeout(
        () =>
          form
            .querySelector<HTMLElement>(
              "[aria-invalid='true'], input[name='distanceAgreement']:not(:checked), input[name='preInformation']:not(:checked)",
            )
            ?.focus(),
        0,
      );
      return;
    }
    setProcessing(true);
    const delivery = deliveryOptions[deliveryMethod];
    const deliveryAddress = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      city: String(formData.get("city") ?? ""),
      district: String(formData.get("district") ?? ""),
      neighborhood: String(formData.get("neighborhood") ?? ""),
      address: String(formData.get("address") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      addressTitle: String(formData.get("addressTitle") ?? ""),
    };
    const billingAddress =
      invoiceType === "individual"
        ? {
            type: "individual",
            identityNumber: String(formData.get("identityNumber") ?? ""),
            firstName: String(formData.get("invoiceFirstName") ?? ""),
            lastName: String(formData.get("invoiceLastName") ?? ""),
            sameAddress,
          }
        : {
            type: "corporate",
            companyName: String(formData.get("companyName") ?? ""),
            taxOffice: String(formData.get("taxOffice") ?? ""),
            taxNumber: String(formData.get("taxNumber") ?? ""),
            companyAddress: String(formData.get("companyAddress") ?? ""),
          };
    const created = await createOrder({
      delivery_address: deliveryAddress,
      billing_address: billingAddress,
      delivery_method: deliveryMethod,
      payment_method: paymentMethod,
      coupon_code: couponCode,
      loyalty_points: loyaltyPoints,
      gift_card_code: credits.giftCode || undefined,
      gift_card_amount: credits.giftAmount || undefined,
      store_credit_amount: credits.storeCreditAmount || undefined,
      selected_shipping_provider: selectedCarrier,
      shipping_note: String(formData.get("shippingNote") ?? ""),
      items: lines.map((line) => ({
        sku: line.product.sku ?? fallbackSkus[line.product.slug] ?? "",
        quantity: line.quantity,
        image_url: line.product.mainImageUrl,
      })),
    });
    if (!created.data) {
      setErrors({ submit: created.error ?? "Sipariş oluşturulamadı." });
      setProcessing(false);
      return;
    }
    const order: DemoOrder = {
      orderNumber: created.data.orderNumber,
      createdAt: created.data.createdAt,
      customerName: `${formData.get("firstName")} ${formData.get("lastName")}`,
      addressSummary: `${formData.get("address")}, ${formData.get("neighborhood")}, ${formData.get("district")}/${formData.get("city")}`,
      deliveryLabel: delivery.label,
      estimatedDelivery: delivery.estimate,
      lines: lines.map((line) => ({
        id: line.product.id,
        slug: line.product.slug,
        name: `${line.product.brand} ${line.product.model}`,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      subtotal: created.data.subtotal,
      discount: created.data.discountTotal,
      shipping: Math.max(
        0,
        created.data.grandTotal -
          created.data.subtotal +
          created.data.discountTotal,
      ),
      vat: Math.round(created.data.grandTotal - created.data.grandTotal / 1.2),
      total: created.data.grandTotal,
    };
    window.sessionStorage.setItem(
      "center-gsm-demo-order",
      JSON.stringify(order),
    );
    window.sessionStorage.setItem(
      "center-gsm-order-access",
      JSON.stringify({
        orderNumber: created.data.orderNumber,
        contact: created.data.contact,
      }),
    );
    clearCart();
    router.push("/siparis-basarili");
  }

  const deliveryCost = deliveryOptions[deliveryMethod].cost;
  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-5">
          <CheckoutSection
            number="1"
            title="Teslimat Bilgileri"
            description="Siparişinizin güvenle ulaşacağı adresi girin."
          >
            <DeliveryAddressForm errors={errors} />
          </CheckoutSection>
          <CheckoutSection
            number="2"
            title="Fatura Bilgileri"
            description="Faturanızı bireysel veya kurumsal olarak düzenleyin."
          >
            <InvoiceForm
              invoiceType={invoiceType}
              setInvoiceType={setInvoiceType}
              sameAddress={sameAddress}
              setSameAddress={setSameAddress}
              errors={errors}
            />
          </CheckoutSection>
          <CheckoutSection
            number="3"
            title="Teslimat Yöntemi"
            description="Size en uygun teslimat seçeneğini belirleyin."
          >
            <DeliveryMethods
              value={deliveryMethod}
              onChange={setDeliveryMethod}
            />
          </CheckoutSection>
          <CheckoutSection
            number="4"
            title="Kargo Firması Seç"
            description="Siparişinizi teslim edecek kargo firmasını belirleyin."
          >
            <ShippingCarrierSelection
              items={carriers}
              value={selectedCarrier}
              onChange={setSelectedCarrier}
              loading={carriersLoading}
            />
          </CheckoutSection>
          <CheckoutSection
            number="5"
            title="İndirim Kodu"
            description="Kuponunuz server-side doğrulanır ve toplam anında güncellenir."
          >
            <CouponForm />
          </CheckoutSection>
          <CheckoutSection
            number="6"
            title="Kullanılacak Puan"
            description="Puan indirimi sipariş oluşturulurken sunucuda yeniden doğrulanır."
          >
            <LoyaltyPointsInput
              orderTotal={totals.total + deliveryOptions[deliveryMethod].cost}
              onChange={(points, discount) => {
                setLoyaltyPoints(points);
                setLoyaltyDiscount(discount);
              }}
            />
          </CheckoutSection>
          <CheckoutSection
            number="7"
            title="Hediye Kartı ve Mağaza Bakiyesi"
            description="Hediye kartınızı veya mağaza bakiyenizi kullanın."
          >
            <CreditPaymentInput
              remaining={Math.max(
                0,
                totals.total +
                  deliveryOptions[deliveryMethod].cost -
                  loyaltyDiscount,
              )}
              onChange={setCredits}
            />
          </CheckoutSection>
          <CheckoutSection
            number="8"
            title="Ödeme Yöntemi"
            description="Havale veya telefonla onay akışını seçin. Hassas ödeme bilgileri bu sitede alınmaz."
          >
            <PaymentMethods
              value={paymentMethod}
              onChange={setPaymentMethod}
              errors={errors}
            />
          </CheckoutSection>
          <CheckoutSection
            number="9"
            title="Onaylar"
            description="Siparişi oluşturmadan önce belgeleri inceleyin."
          >
            <div className="space-y-3">
              <Agreement
                name="distanceAgreement"
                error={errors.distanceAgreement}
              >
                Mesafeli satış sözleşmesini okudum ve onaylıyorum.
              </Agreement>
              <Agreement name="preInformation" error={errors.preInformation}>
                Ön bilgilendirme formunu okudum ve onaylıyorum.
              </Agreement>
            </div>
            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={processing}
            >
              {processing ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <LockKeyhole className="size-4" aria-hidden="true" />
              )}
              {processing ? "Sipariş oluşturuluyor…" : "Siparişi Tamamla"}
            </Button>
            <p className="mt-3 text-center text-[11px] leading-5 text-muted">
              Hassas kart veya doğrulama bilgileri istenmez ve saklanmaz.
            </p>
            {errors.submit ? (
              <p
                className="mt-3 rounded-md bg-red-50 p-3 text-center text-xs font-semibold text-red-700"
                role="alert"
              >
                {errors.submit}
              </p>
            ) : null}
          </CheckoutSection>
        </div>
        <CheckoutSummary
          deliveryCost={deliveryCost}
          loyaltyDiscount={loyaltyDiscount}
          giftCardAmount={credits.giftAmount}
          storeCreditAmount={credits.storeCreditAmount}
        />
      </div>
    </form>
  );
}

function Agreement({
  name,
  error,
  children,
}: {
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className={`flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 ${error ? "border-danger" : "border-border"}`}
      >
        <input
          type="checkbox"
          name={name}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-1 size-4 shrink-0 accent-red-700"
        />
        <span>{children}</span>
      </label>
      {error ? (
        <p
          id={`${name}-error`}
          className="mt-1.5 text-xs font-semibold text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
