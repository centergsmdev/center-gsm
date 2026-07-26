"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShippingCalculator() {
  const [postalCode, setPostalCode] = useState("");
  const [calculated, setCalculated] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (postalCode.trim()) setCalculated(true);
      }}
    >
      <label
        htmlFor="postal-code"
        className="flex items-center gap-2 text-sm font-bold"
      >
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        Kargo ve teslimat
      </label>
      <div className="mt-3 flex gap-2">
        <Input
          id="postal-code"
          value={postalCode}
          onChange={(event) => {
            setPostalCode(event.target.value);
            setCalculated(false);
          }}
          inputMode="numeric"
          placeholder="Posta kodu"
          maxLength={5}
        />
        <Button type="submit" variant="outline">
          Hesapla
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {calculated
          ? "Tahmini teslimat: 29–31 Temmuz"
          : "Teslimat tarihini görmek için posta kodunuzu girin."}
      </p>
    </form>
  );
}
