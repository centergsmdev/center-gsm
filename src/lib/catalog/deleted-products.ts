import type { CatalogProduct } from "@/types/product";

const STORAGE_KEY = "center-gsm-deleted-product-ids";
export const PRODUCT_DELETED_EVENT = "center-gsm:product-deleted";
export type DeletedProductIdentity = { id: string; slug: string };

function deletedIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return new Set(
      Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

export function removeDeletedProducts(products: CatalogProduct[]) {
  const deleted = deletedIds();
  return deleted.size
    ? products.filter(
        (product) => !deleted.has(product.id) && !deleted.has(product.slug),
      )
    : products;
}

export function markProductDeleted(product: DeletedProductIdentity) {
  const deleted = deletedIds();
  deleted.add(product.id);
  deleted.add(product.slug);
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...deleted].slice(-100)),
  );
  window.dispatchEvent(
    new CustomEvent<DeletedProductIdentity>(PRODUCT_DELETED_EVENT, {
      detail: product,
    }),
  );
}
