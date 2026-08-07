"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole } from "lucide-react";

import { CheckoutSection } from "@/components/checkout/checkout-section";
import {
  AgreementDocumentModal,
  type AgreementDocument,
} from "@/components/checkout/agreement-document-modal";
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
import {
  PAYMENT_RECEIPT_MAX_SIZE,
  PAYMENT_RECEIPT_TYPES,
  uploadPaymentReceipt,
} from "@/lib/payment-receipts/client";
import { fallbackSkus } from "@/lib/catalog/fallback-skus";
import { productDisplayName } from "@/lib/catalog/variants";
import { formatCurrency } from "@/lib/format";
import { trackMetaEvent, trackMetaPurchase } from "@/lib/meta/browser";
import { metaItemId } from "@/lib/meta/item-id";
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
  const {
    isReady: cartReady,
    lines,
    couponCode,
    clearCart,
    totals,
  } = useCart();
  const checkoutTracked = useRef(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [credits, setCredits] = useState<CreditSelection>({
    giftCode: "",
    giftAmount: 0,
    storeCreditAmount: 0,
  });
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("individual");
  const [sameAddress, setSameAddress] = useState(true);

  useEffect(() => {
    if (!cartReady || !lines.length || checkoutTracked.current) return;
    checkoutTracked.current = true;
    const contents = lines.map((line) => ({
      id: metaItemId(line.product.id, line.variant?.id),
      quantity: line.quantity,
      item_price: line.variant?.price ?? line.product.price,
    }));
    trackMetaEvent(
      "InitiateCheckout",
      {
        currency: "TRY",
        value: totals.total,
        content_type: "product",
        content_ids: contents.map((item) => item.id),
        contents,
      },
      { server: true },
    );
  }, [cartReady, lines, totals.total]);
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [carriers, setCarriers] = useState<CheckoutCarrier[]>(
    fallbackCheckoutCarriers,
  );
  const [selectedCarrier, setSelectedCarrier] = useState("yurtici");
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [openDocument, setOpenDocument] = useState<AgreementDocument | null>(
    null,
  );

  useEffect(() => {
    if (cartReady && lines.length === 0 && !processing)
      router.replace("/sepet");
  }, [cartReady, lines.length, processing, router]);

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
    if (!paymentMethod) next.paymentMethod = "Lütfen bir ödeme yöntemi seçin.";
    if (paymentMethod === "transfer") {
      if (!receiptFile)
        next.paymentReceipt = "Lütfen ödeme dekontunu yükleyin.";
      else if (
        !PAYMENT_RECEIPT_TYPES.includes(
          receiptFile.type as (typeof PAYMENT_RECEIPT_TYPES)[number],
        )
      )
        next.paymentReceipt = "JPEG, PNG, WebP veya PDF dosyası yükleyin.";
      else if (receiptFile.size > PAYMENT_RECEIPT_MAX_SIZE)
        next.paymentReceipt = "Dekont dosyası en fazla 10 MB olabilir.";
    }
    return next;
  }

  function validateField(name: string, value: string) {
    let message = "";
    if (requiredFields[name] && !value.trim()) message = requiredFields[name];
    else if (name === "email" && !/^\S+@\S+\.\S+$/.test(value))
      message = "Geçerli bir e-posta adresi girin.";
    else if (name === "phone" && value.replace(/\D/g, "").length < 10)
      message = "Telefon numarası en az 10 rakam olmalıdır.";
    else if (name === "postalCode" && !/^\d{5}$/.test(value))
      message = "Posta kodu 5 rakam olmalıdır.";
    else if (name === "identityNumber" && !/^\d{11}$/.test(value))
      message = "T.C. kimlik numarası 11 rakam olmalıdır.";
    else if (
      invoiceType === "individual" &&
      name === "invoiceFirstName" &&
      !value.trim()
    )
      message = "Fatura adını girin.";
    else if (
      invoiceType === "individual" &&
      name === "invoiceLastName" &&
      !value.trim()
    )
      message = "Fatura soyadını girin.";
    else if (
      invoiceType === "corporate" &&
      name === "companyName" &&
      !value.trim()
    )
      message = "Firma unvanını girin.";
    else if (
      invoiceType === "corporate" &&
      name === "taxOffice" &&
      !value.trim()
    )
      message = "Vergi dairesini girin.";
    else if (name === "taxNumber" && !/^\d{10}$/.test(value))
      message = "Vergi numarası 10 rakam olmalıdır.";
    else if (
      invoiceType === "corporate" &&
      name === "companyAddress" &&
      !value.trim()
    )
      message = "Firma adresini girin.";

    setErrors((current) => {
      if (current[name] === message || (!current[name] && !message))
        return current;
      const next = { ...current };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  }

  function handleFieldBlur(event: React.FocusEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    )
      validateField(target.name, target.value);
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
    if (!paymentMethod) return;
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
        variant_id: line.variant?.id,
        color_name: line.variant?.colorName,
        color_hex: line.variant?.colorHex,
        storage_value: line.variant?.storageValue,
        storage_unit: line.variant?.storageUnit,
        barcode: line.variant?.barcode,
      })),
    });
    if (!created.data) {
      setErrors({ submit: created.error ?? "Sipariş oluşturulamadı." });
      setProcessing(false);
      return;
    }
    if (paymentMethod === "transfer" && receiptFile) {
      const receipt = await uploadPaymentReceipt(
        created.data.orderNumber,
        created.data.contact,
        receiptFile,
      );
      if (receipt.error) {
        setErrors({ submit: receipt.error });
        setProcessing(false);
        return;
      }
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
        name: productDisplayName(line.product),
        quantity: line.quantity,
        lineTotal: line.lineTotal,
        variantLabel: line.variant
          ? [
              line.variant.colorName,
              line.variant.storageValue
                ? `${line.variant.storageValue} ${line.variant.storageUnit}`
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined,
        sku: line.variant?.sku ?? line.product.sku,
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
    trackMetaPurchase({
      orderId: created.data.id,
      value: created.data.grandTotal,
      contents: lines.map((line) => ({
        id: metaItemId(line.product.id, line.variant?.id),
        quantity: line.quantity,
        item_price: line.variant?.price ?? line.product.price,
      })),
    });
    window.sessionStorage.setItem(
      "center-gsm-last-order",
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
  const checkoutTotal = Math.max(
    0,
    totals.total +
      deliveryCost -
      loyaltyDiscount -
      credits.giftAmount -
      credits.storeCreditAmount,
  );
  return (
    <form
      className="min-w-0 max-w-full overflow-x-clip"
      onSubmit={handleSubmit}
      onBlur={handleFieldBlur}
      noValidate
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0 space-y-5">
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
            <CouponForm embedded />
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
              onChange={(method) => {
                setPaymentMethod(method);
                if (method !== "transfer") setReceiptFile(null);
                setErrors((current) => {
                  const next = { ...current };
                  delete next.paymentReceipt;
                  return next;
                });
              }}
              errors={errors}
              receiptFile={receiptFile}
              onReceiptFileChange={(file) => {
                setReceiptFile(file);
                setErrors((current) => {
                  const next = { ...current };
                  delete next.paymentReceipt;
                  return next;
                });
              }}
              receiptError={errors.paymentReceipt}
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
                onOpen={() => setOpenDocument("distance")}
              >
                Mesafeli satış sözleşmesini okudum ve onaylıyorum.
              </Agreement>
              <Agreement
                name="preInformation"
                error={errors.preInformation}
                onOpen={() => setOpenDocument("preInformation")}
              >
                Ön bilgilendirme formunu okudum ve onaylıyorum.
              </Agreement>
            </div>
            <Button
              type="submit"
              size="lg"
              className="mt-6 hidden w-full lg:inline-flex"
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
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-zinc-200 bg-white/95 p-3 shadow-[0_-14px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Genel toplam
            </p>
            <p className="truncate text-xl font-black tracking-[-0.04em]">
              {formatCurrency(checkoutTotal)}
            </p>
          </div>
          <Button
            type="submit"
            size="lg"
            className="shrink-0 shadow-lg"
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
            {processing ? "İşleniyor…" : "Siparişi Tamamla"}
          </Button>
        </div>
      </div>
      <AgreementDocumentModal
        document={openDocument}
        onClose={() => setOpenDocument(null)}
      />
    </form>
  );
}

function Agreement({
  name,
  error,
  children,
  onOpen,
}: {
  name: string;
  error?: string;
  children: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-lg border p-2.5 pl-4 text-sm leading-6 ${error ? "border-danger" : "border-border"}`}
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 py-1.5">
          <input
            type="checkbox"
            name={name}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${name}-error` : undefined}
            className="mt-1 size-4 shrink-0 accent-red-700"
          />
          <span>{children}</span>
        </label>
        <button
          type="button"
          onClick={onOpen}
          className="min-h-10 shrink-0 rounded-full border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${typeof children === "string" ? children : "Belge"} belgesini aç`}
        >
          Aç
        </button>
      </div>
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
