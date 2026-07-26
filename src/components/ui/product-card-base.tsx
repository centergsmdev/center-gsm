import Link from "next/link";
import { Heart, ImageIcon, ShoppingBag, Star } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export type ProductCardBaseProps = {
  href: string;
  name: string;
  brand?: string;
  price: string;
  previousPrice?: string;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  installment?: string;
  image?: ReactNode;
  className?: string;
};

export function ProductCardBase({
  href,
  name,
  brand,
  price,
  previousPrice,
  badge,
  rating,
  reviewCount,
  installment,
  image,
  className,
}: ProductCardBaseProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden hover:-translate-y-1 hover:border-border-strong hover:shadow-md",
        className,
      )}
    >
      <div className="relative grid aspect-square place-items-center overflow-hidden bg-surface-subtle">
        {badge ? (
          <Badge variant="brand" className="absolute left-4 top-4 z-raised">
            {badge}
          </Badge>
        ) : null}
        <IconButton
          label={`${name} ürününü favorilere ekle`}
          variant="outline"
          size="sm"
          className="absolute right-4 top-4 z-raised bg-white/90 backdrop-blur"
          disabled
        >
          <Heart className="size-4" aria-hidden="true" />
        </IconButton>
        {image ?? (
          <div
            className="flex flex-col items-center gap-3 text-zinc-300"
            aria-label="Ürün görseli alanı"
          >
            <ImageIcon
              className="size-16 transition-transform duration-250 ease-premium group-hover:scale-105"
              strokeWidth={1}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              Görsel alanı
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        {brand ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            {brand}
          </p>
        ) : null}
        <h3 className="mt-2 min-h-12 text-sm font-bold leading-6 text-foreground">
          <Link
            href={href}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {name}
          </Link>
        </h3>
        {rating !== undefined ? (
          <div
            className="mt-2 flex items-center gap-1.5 text-xs text-muted"
            aria-label={`${rating} puan, ${reviewCount ?? 0} değerlendirme`}
          >
            <Star
              className="size-3.5 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            <span className="font-semibold text-zinc-700">
              {rating.toFixed(1)}
            </span>
            <span>({reviewCount ?? 0})</span>
          </div>
        ) : null}
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            {previousPrice ? (
              <p className="text-xs text-muted line-through">{previousPrice}</p>
            ) : null}
            <p className="text-xl font-black tracking-[-0.03em] text-foreground">
              {price}
            </p>
            {installment ? (
              <p className="mt-1 text-[11px] text-muted">{installment}</p>
            ) : null}
          </div>
          <IconButton
            label={`${name} ürününü sepete ekle`}
            variant="dark"
            className="relative z-raised"
            disabled
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}
