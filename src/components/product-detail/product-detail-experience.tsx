"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProductGallery } from "@/components/product-detail/product-gallery";
import { ProductInfo } from "@/components/product-detail/product-info";
import type { CatalogProduct, CatalogProductVariant } from "@/types/product";

function storageKey(variant: CatalogProductVariant) {
  return variant.storageValue && variant.storageUnit
    ? `${variant.storageValue}-${variant.storageUnit}`
    : undefined;
}

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
  const initialStorage = variants.find(
    (variant) =>
      variant.storageValue &&
      `${variant.storageValue}` === searchParams.get("storage"),
  );
  const [selectedColorId, setSelectedColorId] = useState(initialColor?.id);
  const [selectedStorageKey, setSelectedStorageKey] = useState(
    initialStorage ? storageKey(initialStorage) : undefined,
  );

  useEffect(() => {
    const color = colors.find(
      (item) => item.name === searchParams.get("color"),
    );
    const storage = variants.find(
      (variant) =>
        variant.storageValue &&
        `${variant.storageValue}` === searchParams.get("storage"),
    );
    setSelectedColorId(color?.id);
    setSelectedStorageKey(storage ? storageKey(storage) : undefined);
  }, [colors, searchParams, variants]);

  const storageOptions = useMemo(
    () =>
      Array.from(
        new Map(
          variants.flatMap((variant) => {
            const key = storageKey(variant);
            return key ? [[key, variant] as const] : [];
          }),
        ).values(),
      ),
    [variants],
  );
  const requiresColor = colors.length > 0;
  const requiresStorage = storageOptions.length > 0;
  const selectedVariant = variants.find(
    (variant) =>
      (!requiresColor || variant.colorId === selectedColorId) &&
      (!requiresStorage || storageKey(variant) === selectedStorageKey),
  );
  const selectedColor = colors.find((color) => color.id === selectedColorId);
  const selectionComplete =
    (!requiresColor || Boolean(selectedColorId)) &&
    (!requiresStorage || Boolean(selectedStorageKey)) &&
    Boolean(selectedVariant);

  function updateUrl(colorId?: string, storage?: string) {
    const next = new URLSearchParams(searchParams.toString());
    const color = colors.find((item) => item.id === colorId);
    const storageVariant = variants.find(
      (variant) => storageKey(variant) === storage,
    );
    if (color) next.set("color", color.name);
    else next.delete("color");
    if (storageVariant?.storageValue)
      next.set("storage", `${storageVariant.storageValue}`);
    else next.delete("storage");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function selectColor(colorId: string) {
    setSelectedColorId(colorId);
    const combinationExists = variants.some(
      (variant) =>
        variant.colorId === colorId &&
        storageKey(variant) === selectedStorageKey,
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
        monthlyInstallment: Math.round(
          selectedVariant.price / product.installmentCount,
        ),
        availableStock: selectedVariant.stockQuantity,
        stockStatus:
          selectedVariant.stockQuantity === 0
            ? "out-of-stock"
            : selectedVariant.stockQuantity <= 5
              ? "limited"
              : "in-stock",
        sku: selectedVariant.sku,
      }
    : product;
  const galleryImages = selectedColor?.imageUrls.length
    ? selectedColor.imageUrls
    : product.imageUrls;

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
      />
    </div>
  );
}
