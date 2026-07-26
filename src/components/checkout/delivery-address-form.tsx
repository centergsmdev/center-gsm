import {
  CheckoutField,
  CheckoutSelect,
  CheckoutTextarea,
} from "@/components/checkout/checkout-field";

export function DeliveryAddressForm({
  errors,
}: {
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CheckoutField
        label="Ad"
        name="firstName"
        autoComplete="given-name"
        required
        error={errors.firstName}
      />
      <CheckoutField
        label="Soyad"
        name="lastName"
        autoComplete="family-name"
        required
        error={errors.lastName}
      />
      <CheckoutField
        label="Telefon"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="05XX XXX XX XX"
        required
        error={errors.phone}
      />
      <CheckoutField
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="ornek@eposta.com"
        required
        error={errors.email}
      />
      <CheckoutSelect
        label="İl"
        name="city"
        autoComplete="address-level1"
        required
        error={errors.city}
        defaultValue=""
      >
        <option value="" disabled>
          İl seçin
        </option>
        <option>İstanbul</option>
        <option>Ankara</option>
        <option>İzmir</option>
        <option>Bursa</option>
      </CheckoutSelect>
      <CheckoutSelect
        label="İlçe"
        name="district"
        autoComplete="address-level2"
        required
        error={errors.district}
        defaultValue=""
      >
        <option value="" disabled>
          İlçe seçin
        </option>
        <option>Kadıköy</option>
        <option>Beşiktaş</option>
        <option>Çankaya</option>
        <option>Konak</option>
      </CheckoutSelect>
      <CheckoutField
        label="Mahalle"
        name="neighborhood"
        autoComplete="address-level3"
        required
        error={errors.neighborhood}
      />
      <CheckoutField
        label="Posta kodu"
        name="postalCode"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
        required
        error={errors.postalCode}
      />
      <CheckoutTextarea
        label="Açık adres"
        name="address"
        autoComplete="street-address"
        required
        error={errors.address}
        className="sm:col-span-2"
        placeholder="Sokak, bina ve daire bilgileri"
      />
      <CheckoutField
        label="Adres başlığı"
        name="addressTitle"
        required
        error={errors.addressTitle}
        className="sm:col-span-2"
        placeholder="Ev, İş vb."
      />
    </div>
  );
}
