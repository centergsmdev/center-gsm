"use client";

import { useEffect, useState } from "react";

import {
  CheckoutField,
  CheckoutSelect,
  CheckoutTextarea,
} from "@/components/checkout/checkout-field";
import {
  getProvinceDistricts,
  TURKEY_PROVINCES,
  type District,
} from "@/data/turkey-locations";

export function DeliveryAddressForm({
  errors,
}: {
  errors: Record<string, string>;
}) {
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [districts, setDistricts] = useState<readonly District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtsFailed, setDistrictsFailed] = useState(false);

  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    const controller = new AbortController();
    setDistrictsLoading(true);
    setDistrictsFailed(false);
    void getProvinceDistricts(provinceId, controller.signal)
      .then(setDistricts)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setDistricts([]);
        setDistrictsFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDistrictsLoading(false);
      });
    return () => controller.abort();
  }, [provinceId]);

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
        value={city}
        onChange={(event) => {
          const option = event.currentTarget.selectedOptions[0];
          setCity(event.currentTarget.value);
          setProvinceId(Number(option.dataset.provinceId));
          setDistrict("");
        }}
      >
        <option value="" disabled>
          İl seçin
        </option>
        {TURKEY_PROVINCES.map((province) => (
          <option
            key={province.id}
            value={province.name}
            data-province-id={province.id}
          >
            {province.name}
          </option>
        ))}
      </CheckoutSelect>
      <CheckoutSelect
        label="İlçe"
        name="district"
        autoComplete="address-level2"
        required
        error={errors.district}
        value={district}
        disabled={!provinceId || districtsLoading || districtsFailed}
        onChange={(event) => setDistrict(event.currentTarget.value)}
      >
        <option value="" disabled>
          {districtsLoading
            ? "İlçeler yükleniyor…"
            : districtsFailed
              ? "İlçeler yüklenemedi"
              : provinceId
                ? "İlçe seçin"
                : "Önce il seçin"}
        </option>
        {districts.map((item) => (
          <option key={item.id} value={item.name}>
            {item.name}
          </option>
        ))}
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
