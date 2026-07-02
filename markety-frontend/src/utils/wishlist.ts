import { Product } from '../types';

const WISHLIST_STORAGE_KEY = 'markety_wishlist';

interface WishlistStorage {
  [userId: string]: Product[];
}

/**
 * Get wishlist for a specific user from localStorage
 */
export const getWishlist = (userId: string): Product[] => {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) return [];
    const data: WishlistStorage = JSON.parse(stored);
    return data[userId] || [];
  } catch {
    return [];
  }
};

/**
 * Save wishlist for a specific user to localStorage
 */
export const saveWishlist = (userId: string, products: Product[]): void => {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    const data: WishlistStorage = stored ? JSON.parse(stored) : {};
    data[userId] = products;
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(data));
    // Dispatch custom event to notify other components in the same tab
    window.dispatchEvent(new CustomEvent('wishlist-updated', { detail: { userId } }));
  } catch (error) {
    console.error('Failed to save wishlist:', error);
  }
};

/**
 * Add a product to wishlist
 */
export const addToWishlist = (userId: string, product: Product): void => {
  const wishlist = getWishlist(userId);
  const exists = wishlist.some((p) => p.id === product.id);
  if (!exists) {
    wishlist.push(product);
    saveWishlist(userId, wishlist);
  }
};

/**
 * Remove a product from wishlist
 */
export const removeFromWishlist = (userId: string, productId: string): void => {
  const wishlist = getWishlist(userId);
  const filtered = wishlist.filter((p) => p.id !== productId);
  saveWishlist(userId, filtered);
};

/**
 * Check if a product is in wishlist
 */
export const isInWishlist = (userId: string, productId: string): boolean => {
  const wishlist = getWishlist(userId);
  return wishlist.some((p) => p.id === productId);
};

/**
 * Clear wishlist for a user (useful on logout)
 */
export const clearWishlist = (userId: string): void => {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) return;
    const data: WishlistStorage = JSON.parse(stored);
    delete data[userId];
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to clear wishlist:', error);
  }
};

