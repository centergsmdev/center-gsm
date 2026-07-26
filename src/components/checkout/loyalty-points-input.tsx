"use client";
import { useEffect, useState } from "react";
import { Gift, LoaderCircle } from "lucide-react";
import { getMyLoyalty } from "@/lib/loyalty";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function LoyaltyPointsInput({
  orderTotal,
  onChange,
}: {
  orderTotal: number;
  onChange: (points: number, discount: number) => void;
}) {
  const [available, setAvailable] = useState(0),
    [valuePerPoint, setValuePerPoint] = useState(0.01),
    [maxPoints, setMaxPoints] = useState<number | null>(null),
    [input, setInput] = useState(""),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState("");
  useEffect(() => {
    void getMyLoyalty().then((r) => {
      if (r.data) {
        setAvailable(r.data.account?.available_points ?? 0);
        setValuePerPoint(r.data.rule?.redemption_value_per_point ?? 0.01);
        setMaxPoints(r.data.rule?.maximum_redeemable_points ?? null);
      }
      setLoading(false);
    });
  }, []);
  function apply() {
    const requested = Math.floor(Number(input));
    const limit = Math.min(
      available,
      maxPoints ?? available,
      Math.floor(orderTotal / valuePerPoint),
    );
    if (!Number.isFinite(requested) || requested <= 0 || requested > limit) {
      setMessage(
        `En fazla ${limit.toLocaleString("tr-TR")} puan kullanabilirsiniz.`,
      );
      onChange(0, 0);
      return;
    }
    const discount = Math.min(
      orderTotal,
      Number((requested * valuePerPoint).toFixed(2)),
    );
    onChange(requested, discount);
    setMessage(
      `${requested.toLocaleString("tr-TR")} puan uygulandı · ${formatCurrency(discount)} indirim`,
    );
  }
  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" />
        Puan bakiyesi yükleniyor…
      </p>
    );
  if (!available)
    return (
      <div className="flex gap-3 rounded-xl bg-zinc-50 p-4">
        <Gift className="size-5 text-red-600" />
        <p className="text-sm">
          <strong>Henüz kullanılabilir puanınız yok.</strong>
          <br />
          <span className="text-muted">
            Teslim edilen siparişlerden puan kazanırsınız.
          </span>
        </p>
      </div>
    );
  return (
    <div>
      <p className="mb-3 text-sm">
        Kullanılabilir:{" "}
        <strong>{available.toLocaleString("tr-TR")} puan</strong>
      </p>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          max={Math.min(available, maxPoints ?? available)}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Puan miktarı"
          aria-label="Kullanılacak puan"
        />
        <Button type="button" variant="outline" onClick={apply}>
          Uygula
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {message || `1 puan = ${formatCurrency(valuePerPoint)}`}
      </p>
    </div>
  );
}
