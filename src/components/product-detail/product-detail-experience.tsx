"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProductGallery } from "@/components/product-detail/product-gallery";
import { ProductInfo } from "@/components/product-detail/product-info";
import { calculateMonthlyInstallment } from "@/lib/catalog/installments";
import {
  resolveSelectedVariant,
  storageKeyFromParam,
  variantStorageKey,
} from "@/lib/catalog/variants";
import type { CatalogProduct } from "@/types/product";

export function ProductDetailExperience({
  product,
}: {
  product: CatalogProduct;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const variants = useMemo(
    () =>
      [...(product.variants ?? [])]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .filter((variant) => variant.colorId || variant.storageValue),
    [product.variants],
  );
  const colors = useMemo(() => product.colors ?? [], [product.colors]);
  const initialColor = colors.find(
    (color) => color.name === searchParams.get("color"),
  );
  const [selectedColorId, setSelectedColorId] = useState(initialColor?.id);
  const [selectedStorageKey, setSelectedStorageKey] = useState(
    storageKeyFromParam(variants, searchParams.get("storage")),
  );

  useEffect(() => {
    const color = colors.find(
      (item) => item.name === searchParams.get("color"),
    );
    setSelectedColorId(color?.id);
    setSelectedStorageKey(
      storageKeyFromParam(variants, searchParams.get("storage")),
    );
  }, [colors, searchParams, variants]);

  const storageOptions = useMemo(
    () =>
      Array.from(
        new Map(
          variants.flatMap((variant) => {
            const key = variantStorageKey(variant);
            return key ? [[key, variant] as const] : [];
          }),
        ).values(),
      ),
    [variants],
  );
  const requiresColor = colors.length > 0;
  const requiresStorage = storageOptions.length > 0;
  const selectedVariant = resolveSelectedVariant(
    variants,
    requiresColor ? selectedColorId : undefined,
    requiresStorage ? selectedStorageKey : undefined,
  );
  const selectedColor = colors.find((color) => color.id === selectedColorId);
  const selectionComplete =
    (!requiresColor || Boolean(selectedColorId)) &&
    (!requiresStorage || Boolean(selectedStorageKey)) &&
    Boolean(selectedVariant);

  function updateUrl(colorId?: string, storage?: string) {
    const next = new URLSearchParams(searchParams.toString());
    const color = colors.find((item) => item.id === colorId);
    if (color) next.set("color", color.name);
    else next.delete("color");
    if (storage) next.set("storage", storage);
    else next.delete("storage");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function selectColor(colorId: string) {
    setSelectedColorId(colorId);
    const combinationExists = variants.some(
      (variant) =>
        variant.colorId === colorId &&
        variantStorageKey(variant) === selectedStorageKey,
    );
    const nextStorage = combinationExists ? selectedStorageKey : undefined;
    if (!combinationExists) setSelectedStorageKey(undefined);
    updateUrl(colorId, nextStorage);
  }

  function selectStorage(storage: string) {
    setSelectedStorageKey(storage);
    updateUrl(selectedColorId, storage);
  }

  const displayProduct: CatalogProduct = selectedVariant
    ? {
        ...product,
        price: selectedVariant.price,
        previousPrice: selectedVariant.previousPrice,
        discountRate:
          selectedVariant.previousPrice &&
          selectedVariant.previousPrice > selectedVariant.price
            ? Math.round(
                ((selectedVariant.previousPrice - selectedVariant.price) /
                  selectedVariant.previousPrice) *
                  100,
              )
            : undefined,
        monthlyInstallment: calculateMonthlyInstallment(
          selectedVariant.price,
          product.installmentCount,
        ),
        availableStock: selectedVariant.stockQuantity,
        stockStatus:
          selectedVariant.stockQuantity === 0
            ? "out-of-stock"
            : selectedVariant.stockQuantity <= 5
              ? "limited"
              : "in-stock",
        sku: selectedVariant.sku,
        mainImageUrl: selectedColor?.imageUrls[0] ?? product.mainImageUrl,
        imageUrls: selectedColor?.imageUrls.length
          ? selectedColor.imageUrls
          : product.imageUrls,
      }
    : product;
  const galleryImages = selectedColor?.imageUrls.length
    ? selectedColor.imageUrls
    : product.imageUrls;
  const cartVariant = selectedVariant
    ? {
        id: selectedVariant.id,
        colorName: selectedColor?.displayName ?? selectedColor?.name,
        colorHex: selectedColor?.hexCode,
        storageValue: selectedVariant.storageValue,
        storageUnit: selectedVariant.storageUnit,
        sku: selectedVariant.sku,
        barcode: selectedVariant.barcode,
        price: selectedVariant.price,
        previousPrice: selectedVariant.previousPrice,
        stockQuantity: selectedVariant.stockQuantity,
      }
    : undefined;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-start lg:gap-12">
      <ProductGallery
        product={displayProduct}
        imageUrls={galleryImages}
        galleryKey={selectedColorId ?? "default"}
      />
      <ProductInfo
        product={displayProduct}
        colors={colors}
        variants={variants}
        storageOptions={storageOptions}
        selectedColorId={selectedColorId}
        selectedStorageKey={selectedStorageKey}
        selectionRequired={requiresColor || requiresStorage}
        selectionComplete={selectionComplete}
        onColorChange={selectColor}
        onStorageChange={selectStorage}
        cartVariant={cartVariant}
      />
    </div>
  );
}
