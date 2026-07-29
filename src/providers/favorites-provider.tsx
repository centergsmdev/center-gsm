"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  addUserFavorite,
  getUserFavorites,
  removeUserFavorite,
  syncLocalFavoritesToUser,
} from "@/lib/favorites/data";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/client";
import type { CatalogProduct } from "@/types/product";

const STORAGE_KEY = "center-gsm-favorites-v2";
const safeError = "Favori işlemi tamamlanamadı. Lütfen yeniden deneyin.";

type FavoritesContextValue = {
  favoriteIds: string[];
  favoriteProducts: CatalogProduct[];
  count: number;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  isFavorite: (productId: string) => boolean;
  addFavorite: (product: CatalogProduct) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (product: CatalogProduct) => void;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function isStoredProduct(value: unknown): value is CatalogProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<CatalogProduct>;
  return (
    typeof product.id === "string" &&
    typeof product.slug === "string" &&
    typeof product.brand === "string" &&
    typeof product.model === "string" &&
    typeof product.price === "number"
  );
}

function readGuestFavorites(): CatalogProduct[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isStoredProduct) : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const activeUserRef = useRef<string | null>(null);

  const favoriteIds = useMemo(
    () => products.map((product) => product.id),
    [products],
  );

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 0);
  }, []);

  const loadRemoteFavorites = useCallback(async (currentUserId: string) => {
    const result = await getUserFavorites(currentUserId);
    if (activeUserRef.current !== currentUserId) return false;
    if (!result.success) {
      setError(safeError);
      return false;
    }
    setProducts(result.data);
    setError(null);
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    const client = createClient();
    const enterGuestMode = () => {
      if (!active) return;
      activeUserRef.current = null;
      setUserId(null);
      setProducts(readGuestFavorites());
      setError(null);
      setLoading(false);
    };
    const enterUserMode = async (currentUserId: string) => {
      activeUserRef.current = currentUserId;
      setUserId(currentUserId);
      setLoading(true);
      setError(null);
      const guestProducts = readGuestFavorites();
      if (guestProducts.length) {
        const sync = await syncLocalFavoritesToUser(
          currentUserId,
          guestProducts.map((product) => product.id),
        );
        if (!active || activeUserRef.current !== currentUserId) return;
        if (sync.success) window.localStorage.removeItem(STORAGE_KEY);
        else setError(safeError);
      }
      await loadRemoteFavorites(currentUserId);
      if (active && activeUserRef.current === currentUserId) setLoading(false);
    };

    if (!client) {
      enterGuestMode();
      return () => {
        active = false;
      };
    }
    const auth = authApi(client);
    void auth.getSession().then(({ data }) => {
      const id = data.session?.user.id;
      if (id) void enterUserMode(id);
      else enterGuestMode();
    });
    const { data } = auth.onAuthStateChange((event, session) => {
      const id = session?.user.id;
      if (id && id !== activeUserRef.current) void enterUserMode(id);
      if (!id && activeUserRef.current !== null) enterGuestMode();
      if (event === "SIGNED_OUT") window.localStorage.removeItem(STORAGE_KEY);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadRemoteFavorites, reloadKey]);

  useEffect(() => {
    if (isLoading || userId) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [isLoading, products, userId]);

  const mutateRemote = useCallback(
    async (productId: string, adding: boolean, previous: CatalogProduct[]) => {
      if (!userId) return;
      const result = adding
        ? await addUserFavorite(userId, productId)
        : await removeUserFavorite(userId, productId);
      if (activeUserRef.current !== userId) return;
      if (!result.success) {
        setProducts(previous);
        setError(safeError);
        announce("Favori işlemi geri alındı.");
        return;
      }
      setError(null);
      await loadRemoteFavorites(userId);
    },
    [announce, loadRemoteFavorites, userId],
  );

  const addFavorite = useCallback(
    (product: CatalogProduct) => {
      if (favoriteIds.includes(product.id)) return;
      const previous = products;
      setProducts([...previous, product]);
      announce("Ürün favorilere eklendi.");
      void mutateRemote(product.id, true, previous);
    },
    [announce, favoriteIds, mutateRemote, products],
  );

  const removeFavorite = useCallback(
    (productId: string) => {
      if (!favoriteIds.includes(productId)) return;
      const previous = products;
      setProducts(previous.filter((product) => product.id !== productId));
      announce("Ürün favorilerden kaldırıldı.");
      void mutateRemote(productId, false, previous);
    },
    [announce, favoriteIds, mutateRemote, products],
  );

  const clearFavorites = useCallback(() => {
    const previous = products;
    setProducts([]);
    if (!userId) return;
    void Promise.all(
      previous.map((product) => removeUserFavorite(userId, product.id)),
    ).then((results) => {
      if (activeUserRef.current !== userId) return;
      if (results.some((result) => !result.success)) {
        setProducts(previous);
        setError(safeError);
      } else {
        setError(null);
      }
    });
  }, [products, userId]);

  const value: FavoritesContextValue = {
    favoriteIds,
    favoriteProducts: products,
    count: products.length,
    isLoading,
    error,
    retry: () => setReloadKey((key) => key + 1),
    isFavorite: (productId) => favoriteIds.includes(productId),
    addFavorite,
    removeFavorite,
    toggleFavorite: (product) =>
      favoriteIds.includes(product.id)
        ? removeFavorite(product.id)
        : addFavorite(product),
    clearFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement || error}
      </p>
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
