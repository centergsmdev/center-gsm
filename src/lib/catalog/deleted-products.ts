import type { CatalogProduct } from "@/types/product";
import { createClient } from "@/lib/supabase/client";

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

export function clearProductDeleted(product: DeletedProductIdentity) {
  const deleted = deletedIds();
  deleted.delete(product.id);
  deleted.delete(product.slug);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...deleted]));
}

export async function removeUnavailableProducts(products: CatalogProduct[]) {
  const locallyAvailable = removeDeletedProducts(products);
  if (!locallyAvailable.length) return [];
  const client = createClient();
  if (!client) return locallyAvailable;
  const slugs = [...new Set(locallyAvailable.map((product) => product.slug))];
  const result = await client
    .from("products")
    .select("slug")
    .in("slug", slugs)
    .eq("is_active", true);
  if (result.error) return locallyAvailable;
  const activeSlugs = new Set(result.data.map((product) => product.slug));
  return locallyAvailable.filter((product) => activeSlugs.has(product.slug));
}

export function subscribeToUnavailableProducts(
  listener: (product: DeletedProductIdentity) => void,
) {
  const onProductDeleted = (event: Event) =>
    listener((event as CustomEvent<DeletedProductIdentity>).detail);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const values: unknown = JSON.parse(event.newValue);
      if (Array.isArray(values))
        values
          .filter((value): value is string => typeof value === "string")
          .forEach((value) => listener({ id: value, slug: value }));
    } catch {
      // Bozuk bir storage olayı mevcut güvenilir state'i değiştirmez.
    }
  };
  window.addEventListener(PRODUCT_DELETED_EVENT, onProductDeleted);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PRODUCT_DELETED_EVENT, onProductDeleted);
    window.removeEventListener("storage", onStorage);
  };
}
