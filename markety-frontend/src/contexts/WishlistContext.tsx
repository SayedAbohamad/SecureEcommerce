import { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { recommendationApi } from '../api/recommendations';
import {
  getWishlist,
  addToWishlist as addToWishlistStorage,
  removeFromWishlist as removeFromWishlistStorage,
  isInWishlist as isInWishlistStorage,
} from '../utils/wishlist';

interface WishlistContextValue {
  wishlist: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
}

export const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const WishlistProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);

  const userId = user?.id || '';

  // Load wishlist when user changes
  useEffect(() => {
    if (userId) {
      setWishlist(getWishlist(userId));
    } else {
      setWishlist([]);
    }
  }, [userId]);

  // Listen for storage changes to sync wishlist across tabs/components
  useEffect(() => {
    if (!userId) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'markety_wishlist') {
        setWishlist(getWishlist(userId));
      }
    };

    const handleWishlistUpdate = (e: CustomEvent) => {
      if (e.detail?.userId === userId) {
        setWishlist(getWishlist(userId));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wishlist-updated', handleWishlistUpdate as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wishlist-updated', handleWishlistUpdate as EventListener);
    };
  }, [userId]);

  const addToWishlist = useCallback(
    (product: Product) => {
      if (!userId) return;
      addToWishlistStorage(userId, product);
      recommendationApi.trackQuietly({
        eventType: 'wishlist_add',
        productId: product.id,
        source: 'wishlist_context',
      });
      setWishlist((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        if (exists) return prev;
        return [...prev, product];
      });
    },
    [userId],
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      if (!userId) return;
      removeFromWishlistStorage(userId, productId);
      recommendationApi.trackQuietly({
        eventType: 'wishlist_remove',
        productId,
        source: 'wishlist_context',
      });
      setWishlist((prev) => prev.filter((p) => p.id !== productId));
    },
    [userId],
  );

  const toggleWishlist = useCallback(
    (product: Product) => {
      if (!userId) return;
      if (isInWishlistStorage(userId, product.id)) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    },
    [userId, addToWishlist, removeFromWishlist],
  );

  const isInWishlist = useCallback(
    (productId: string) => {
      if (!userId) return false;
      return isInWishlistStorage(userId, productId);
    },
    [userId],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
    }),
    [wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
