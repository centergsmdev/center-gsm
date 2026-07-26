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

import { catalogProducts } from "@/data/catalog-products";
import {
  addUserFavorite,
  getUserFavorites,
  removeUserFavorite,
  syncLocalFavoritesToUser,
} from "@/lib/favorites/data";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/client";
import type { CatalogProduct } from "@/types/product";

const STORAGE_KEY = "center-gsm-demo-favorites";
const initialFavoriteIds = ["p-003"];
const safeError = "Favori işlemi tamamlanamadı. Lütfen yeniden deneyin.";

type FavoritesContextValue = {
  favoriteIds: string[];
  favoriteProducts: CatalogProduct[];
  count: number;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  isFavorite: (productId: string) => boolean;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readGuestFavorites() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialFavoriteIds;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? [...new Set(parsed)]
      : initialFavoriteIds;
  } catch {
    return initialFavoriteIds;
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(initialFavoriteIds);
  const [remoteProducts, setRemoteProducts] = useState<CatalogProduct[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const activeUserRef = useRef<string | null>(null);

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
    setRemoteProducts(result.data);
    setFavoriteIds(result.data.map((product) => product.id));
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
      setRemoteProducts([]);
      setFavoriteIds(readGuestFavorites());
      setError(null);
      setLoading(false);
    };
    const enterUserMode = async (currentUserId: string) => {
      activeUserRef.current = currentUserId;
      setUserId(currentUserId);
      setFavoriteIds([]);
      setRemoteProducts([]);
      setLoading(true);
      setError(null);
      const guestIds = readGuestFavorites();
      const hadGuestStorage = window.localStorage.getItem(STORAGE_KEY) !== null;
      if (hadGuestStorage && guestIds.length) {
        const sync = await syncLocalFavoritesToUser(currentUserId, guestIds);
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
      if (!id && activeUserRef.current !== null) {
        window.localStorage.removeItem(STORAGE_KEY);
        activeUserRef.current = null;
        setUserId(null);
        setRemoteProducts([]);
        setFavoriteIds([]);
        setError(null);
        setLoading(false);
      }
      if (event === "SIGNED_OUT") window.localStorage.removeItem(STORAGE_KEY);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadRemoteFavorites, reloadKey]);

  useEffect(() => {
    if (isLoading || userId) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, isLoading, userId]);

  const favoriteProducts = useMemo(() => {
    if (userId) {
      const products = new Map(remoteProducts.map((item) => [item.id, item]));
      for (const id of favoriteIds) {
        const fallback = catalogProducts.find((item) => item.id === id);
        if (fallback && !products.has(id)) products.set(id, fallback);
      }
      return favoriteIds.flatMap((id) => {
        const product = products.get(id);
        return product ? [product] : [];
      });
    }
    return favoriteIds.flatMap((id) => {
      const product = catalogProducts.find((item) => item.id === id);
      return product ? [product] : [];
    });
  }, [favoriteIds, remoteProducts, userId]);

  const mutateRemote = useCallback(
    async (productId: string, adding: boolean, previous: string[]) => {
      if (!userId) return;
      const result = adding
        ? await addUserFavorite(userId, productId)
        : await removeUserFavorite(userId, productId);
      if (activeUserRef.current !== userId) return;
      if (!result.success) {
        setFavoriteIds(previous);
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
    (productId: string) => {
      const previous = favoriteIds;
      if (previous.includes(productId)) return;
      setFavoriteIds([...previous, productId]);
      announce("Ürün favorilere eklendi.");
      void mutateRemote(productId, true, previous);
    },
    [announce, favoriteIds, mutateRemote],
  );
  const removeFavorite = useCallback(
    (productId: string) => {
      const previous = favoriteIds;
      if (!previous.includes(productId)) return;
      setFavoriteIds(previous.filter((id) => id !== productId));
      announce("Ürün favorilerden kaldırıldı.");
      void mutateRemote(productId, false, previous);
    },
    [announce, favoriteIds, mutateRemote],
  );
  const clearFavorites = useCallback(() => {
    const previous = favoriteIds;
    setFavoriteIds([]);
    if (!userId) return;
    void Promise.all(previous.map((id) => removeUserFavorite(userId, id))).then(
      (results) => {
        if (activeUserRef.current !== userId) return;
        if (results.some((result) => !result.success)) {
          setFavoriteIds(previous);
          setError(safeError);
        } else {
          setRemoteProducts([]);
          setError(null);
        }
      },
    );
  }, [favoriteIds, userId]);

  const value: FavoritesContextValue = {
    favoriteIds,
    favoriteProducts,
    count: favoriteIds.length,
    isLoading,
    error,
    retry: () => setReloadKey((key) => key + 1),
    isFavorite: (productId) => favoriteIds.includes(productId),
    addFavorite,
    removeFavorite,
    toggleFavorite: (productId) =>
      favoriteIds.includes(productId)
        ? removeFavorite(productId)
        : addFavorite(productId),
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
  if (!context)
    throw new Error("useFavorites must be used within FavoritesProvider");
  return context;
}
