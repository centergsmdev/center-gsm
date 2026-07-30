"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { catalogProducts } from "@/data/catalog-products";
import { fallbackSkus } from "@/lib/catalog/fallback-skus";
import {
  PRODUCT_DELETED_EVENT,
  removeDeletedProducts,
} from "@/lib/catalog/deleted-products";
import { calculateCheckoutPricing } from "@/lib/promotions/client";
import type { CartItem, CartLine, CartTotals } from "@/types/cart";
import type { CatalogProduct } from "@/types/product";

const STORAGE_KEY = "center-gsm-cart-v1";
const initialItems: CartItem[] = [];
type CouponResult = { success: boolean; error?: string };
type CartContextValue = {
  items: CartItem[];
  lines: CartLine[];
  itemCount: number;
  totals: CartTotals;
  couponCode: string | null;
  promotionLoading: boolean;
  promotionError: string | null;
  addItem: (
    productId: string,
    quantity?: number,
    product?: CatalogProduct,
  ) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  moveToFavorites: (productId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<CouponResult>;
  removeCoupon: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [campaignDiscount, setCampaignDiscount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        const products = removeDeletedProducts(
          parsed.flatMap((item) =>
            item.product
              ? [item.product]
              : catalogProducts.filter(
                  (product) => product.id === item.productId,
                ),
          ),
        );
        const activeIds = new Set(products.map((product) => product.id));
        setItems(parsed.filter((item) => activeIds.has(item.productId)));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setStorageReady(true);
    const removeDeleted = (event: Event) => {
      const deleted = (event as CustomEvent<{ id: string; slug: string }>)
        .detail;
      setItems((current) =>
        current.filter(
          (item) =>
            item.productId !== deleted.id &&
            item.product?.slug !== deleted.slug,
        ),
      );
    };
    window.addEventListener(PRODUCT_DELETED_EVENT, removeDeleted);
    return () =>
      window.removeEventListener(PRODUCT_DELETED_EVENT, removeDeleted);
  }, []);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, storageReady]);
  const lines = useMemo(
    () =>
      items.flatMap((item) => {
        const product =
          item.product ??
          catalogProducts.find((candidate) => candidate.id === item.productId);
        return product
          ? [
              {
                product,
                quantity: item.quantity,
                lineTotal: product.price * item.quantity,
              },
            ]
          : [];
      }),
    [items],
  );
  const quoteItems = useMemo(
    () =>
      lines.map((line) => ({
        sku: line.product.sku ?? fallbackSkus[line.product.slug] ?? "",
        quantity: line.quantity,
      })),
    [lines],
  );
  const refreshPromotions = useCallback(
    async (code: string | null): Promise<CouponResult> => {
      if (!quoteItems.length || quoteItems.some((item) => !item.sku)) {
        setCampaignDiscount(0);
        setCouponDiscount(0);
        setFreeShipping(false);
        return {
          success: !code,
          error: code ? "Sepette doğrulanamayan ürün bulunuyor." : undefined,
        };
      }
      setPromotionLoading(true);
      const result = await calculateCheckoutPricing(quoteItems, code);
      setPromotionLoading(false);
      if (!result.data) {
        setPromotionError(result.error);
        if (code) {
          setCouponDiscount(0);
          setFreeShipping(false);
        }
        return { success: false, error: result.error ?? undefined };
      }
      setCampaignDiscount(result.data.campaignDiscount);
      setCouponDiscount(result.data.couponDiscount);
      setFreeShipping(result.data.freeShipping ?? false);
      setPromotionError(null);
      return { success: true };
    },
    [quoteItems],
  );
  useEffect(() => {
    const timeout = window.setTimeout(
      () => void refreshPromotions(couponCode),
      200,
    );
    return () => window.clearTimeout(timeout);
  }, [couponCode, refreshPromotions]);
  const totals = useMemo<CartTotals>(() => {
    const listSubtotal = lines.reduce(
      (sum, line) =>
        sum +
        (line.product.previousPrice ?? line.product.price) * line.quantity,
      0,
    );
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const productDiscount = listSubtotal - subtotal;
    const shipping =
      freeShipping || subtotal === 0 || subtotal >= 2500 ? 0 : 149;
    const total = Math.max(
      0,
      subtotal - campaignDiscount - couponDiscount + shipping,
    );
    return {
      listSubtotal,
      subtotal,
      productDiscount,
      campaignDiscount,
      couponDiscount,
      freeShipping,
      shipping,
      total,
      vatIncluded: Math.round(total - total / 1.2),
    };
  }, [campaignDiscount, couponDiscount, freeShipping, lines]);
  const persistMessage = (message: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 0);
  };
  const addItem = (
    productId: string,
    quantity = 1,
    product?: CatalogProduct,
  ) => {
    if (product?.stockStatus === "out-of-stock") return;
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      const max = Math.min(
        10,
        product?.availableStock ?? existing?.product?.availableStock ?? 10,
      );
      return existing
        ? current.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.min(max, item.quantity + quantity) }
              : item,
          )
        : [
            ...current,
            { productId, quantity: Math.min(max, quantity), product },
          ];
    });
    persistMessage("Ürün sepete eklendi.");
  };
  const updateQuantity = (productId: string, quantity: number) =>
    setItems((current) =>
      current.map((item) => {
        const max = Math.min(10, item.product?.availableStock ?? 10);
        return item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(max, quantity)) }
          : item;
      }),
    );
  const removeItem = (productId: string) => {
    setItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
    persistMessage("Ürün sepetten çıkarıldı.");
  };
  const applyCoupon = async (code: string) => {
    const normalized = code.trim().toLocaleUpperCase("tr-TR");
    if (!normalized) return { success: false, error: "Kupon kodunu girin." };
    const result = await refreshPromotions(normalized);
    if (result.success) setCouponCode(normalized);
    persistMessage(
      result.success ? "Kupon kodu uygulandı." : "Kupon kodu uygulanamadı.",
    );
    return result;
  };
  const value: CartContextValue = {
    items,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    totals,
    couponCode,
    promotionLoading,
    promotionError,
    addItem,
    updateQuantity,
    removeItem,
    moveToFavorites: removeItem,
    clearCart: () => {
      setItems([]);
      setCouponCode(null);
      setFreeShipping(false);
    },
    applyCoupon,
    removeCoupon: () => {
      setCouponCode(null);
      setCouponDiscount(0);
      setFreeShipping(false);
      setPromotionError(null);
    },
  };
  return (
    <CartContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </CartContext.Provider>
  );
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
