"use client";

import { Clock3, Store, Truck } from "lucide-react";

import { ChoiceCard } from "@/components/checkout/choice-card";
import type { DeliveryMethod } from "@/types/checkout";

export const deliveryOptions = {
  standard: { label: "Standart teslimat", cost: 0, estimate: "29–31 Temmuz" },
  express: { label: "Hızlı teslimat", cost: 199, estimate: "Yarın" },
  store: {
    label: "Mağazadan teslim alma",
    cost: 0,
    estimate: "Bugün, 2 saat içinde",
  },
} satisfies Record<
  DeliveryMethod,
  { label: string; cost: number; estimate: string }
>;

export function DeliveryMethods({
  value,
  onChange,
}: {
  value: DeliveryMethod;
  onChange: (value: DeliveryMethod) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Teslimat yöntemi seçin</legend>
      <div className="grid gap-3">
        <ChoiceCard
          name="deliveryMethod"
          value="standard"
          checked={value === "standard"}
          onChange={() => onChange("standard")}
          title="Standart teslimat"
          description="Güvenli ve takip edilebilir teslimat"
          detail="Ücretsiz"
          icon={<Truck className="size-5" aria-hidden="true" />}
        />
        <ChoiceCard
          name="deliveryMethod"
          value="express"
          checked={value === "express"}
          onChange={() => onChange("express")}
          title="Hızlı teslimat"
          description="Siparişiniz öncelikli hazırlanır"
          detail="199 TL"
          icon={<Clock3 className="size-5" aria-hidden="true" />}
        />
        <ChoiceCard
          name="deliveryMethod"
          value="store"
          checked={value === "store"}
          onChange={() => onChange("store")}
          title="Mağazadan teslim alma"
          description="Hazır olduğunda bildirim gönderilir"
          detail="Ücretsiz"
          icon={<Store className="size-5" aria-hidden="true" />}
        />
      </div>
    </fieldset>
  );
}
