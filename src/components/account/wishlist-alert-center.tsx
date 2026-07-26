"use client";

import Link from "next/link";
import { BellRing, PackageCheck, Percent, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { getCustomerWishlistAlerts } from "@/lib/wishlist-alerts";
import type { CustomerWishlistAlert } from "@/lib/wishlist-alerts";

const content = {
  price_drop: { title: "Ürünün fiyatı düştü", icon: TrendingDown },
  back_in_stock: { title: "Ürün yeniden stokta", icon: PackageCheck },
  promotion_started: { title: "Ürün kampanyaya girdi", icon: Percent },
} as const;

export function WishlistAlertCenter() {
  const [items, setItems] = useState<CustomerWishlistAlert[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void getCustomerWishlistAlerts().then((result) => {
      if (active) {
        setItems(result.data ?? []);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Card className="mt-6 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <BellRing className="size-5 text-primary" />
        <div>
          <h2 className="font-black">Favori ürün bildirimleri</h2>
          <p className="text-xs text-muted">
            Fiyat, stok ve kampanya değişiklikleri
          </p>
        </div>
      </div>
      {loading ? (
        <p className="mt-5 text-sm text-muted" role="status">
          Bildirimler yükleniyor…
        </p>
      ) : items.length ? (
        <ul className="mt-5 divide-y divide-border">
          {items.map((item) => {
            const meta = content[item.eventType];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="flex items-center gap-3 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{meta.title}</p>
                  <p className="truncate text-xs text-muted">
                    {item.productName}
                  </p>
                </div>
                <Link
                  href={`/urun/${item.productSlug}?wishlistAlert=${item.id}`}
                  className="text-xs font-black text-primary hover:underline"
                >
                  Ürüne git
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl bg-surface-subtle p-4 text-sm text-muted">
          Henüz bir favori alarm bildiriminiz yok.
        </p>
      )}
    </Card>
  );
}
