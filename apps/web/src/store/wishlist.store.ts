'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: string;
    stock: number;
    isActive: boolean;
    image: string | null;
    category: {
      id: string;
      name: string;
    } | null;
  };
}

interface WishlistState {
  items: WishlistItem[];
  count: number;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  fetchWishlist: (isAuthenticated: boolean) => Promise<void>;
  addToWishlist: (productId: string, productName?: string) => Promise<boolean>;
  removeFromWishlist: (itemId: string, productName?: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  reset: () => void;
}

const initialState = {
  items: [],
  count: 0,
  isLoading: false,
  isInitialized: false,
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchWishlist: async (isAuthenticated: boolean) => {
        // Only fetch if authenticated
        if (!isAuthenticated) {
          set({ ...initialState, isInitialized: true });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await apiClient.getWishlist();
          
          if (response.success) {
            set({
              items: response.data.items || [],
              count: response.data.count || 0,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            throw new Error(response.message || 'Failed to fetch wishlist');
          }
        } catch (error: any) {
          console.error('Fetch wishlist error:', error);
          set({ 
            items: [], 
            count: 0, 
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      addToWishlist: async (productId: string, productName?: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.addToWishlist(productId);

          if (response.success) {
            // Refetch wishlist to get updated data
            const wishlistResponse = await apiClient.getWishlist();
            
            if (wishlistResponse.success) {
              set({
                items: wishlistResponse.data.items || [],
                count: wishlistResponse.data.count || 0,
                isLoading: false,
              });
            }

            toast.success(
              productName ? `${productName} added to wishlist` : 'Added to wishlist',
              {
                icon: '❤️',
                duration: 2000,
              }
            );
            return true;
          } else {
            throw new Error(response.message || 'Failed to add to wishlist');
          }
        } catch (error: any) {
          console.error('Add to wishlist error:', error);
          set({ isLoading: false });

          // Show user-friendly error message
          if (error.message.includes('already in wishlist')) {
            toast.error('Already in your wishlist', {
              duration: 2000,
            });
          } else if (error.message.includes('not found')) {
            toast.error('Product not found', {
              duration: 2000,
            });
          } else {
            toast.error('Failed to add to wishlist', {
              duration: 2000,
            });
          }
          return false;
        }
      },

      removeFromWishlist: async (itemId: string, productName?: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.removeFromWishlist(itemId);

          if (response.success) {
            // Remove item from state
            const currentItems = get().items;
            const updatedItems = currentItems.filter((item) => item.id !== itemId);

            set({
              items: updatedItems,
              count: updatedItems.length,
              isLoading: false,
            });

            toast.success(
              productName ? `${productName} removed from wishlist` : 'Removed from wishlist',
              {
                duration: 2000,
              }
            );
          } else {
            throw new Error(response.message || 'Failed to remove from wishlist');
          }
        } catch (error: any) {
          console.error('Remove from wishlist error:', error);
          set({ isLoading: false });
          toast.error('Failed to remove from wishlist', {
            duration: 2000,
          });
        }
      },

      clearWishlist: async () => {
        set({ isLoading: true });
        try {
          const response = await apiClient.clearWishlist();

          if (response.success) {
            set({
              items: [],
              count: 0,
              isLoading: false,
            });

            toast.success('Wishlist cleared', {
              duration: 2000,
            });
          } else {
            throw new Error(response.message || 'Failed to clear wishlist');
          }
        } catch (error: any) {
          console.error('Clear wishlist error:', error);
          set({ isLoading: false });
          toast.error('Failed to clear wishlist', {
            duration: 2000,
          });
        }
      },

      isInWishlist: (productId: string) => {
        const items = get().items;
        return items.some((item) => item.productId === productId);
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'robohatch-wishlist',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist items and count, not loading/initialized states
        items: state.items,
        count: state.count,
      }),
    }
  )
);
