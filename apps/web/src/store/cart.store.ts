import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product, CustomDesign } from '@/types';
import { apiClient } from '@/lib/api-client';

export interface CartItem {
  product?: Product;
  customDesign?: CustomDesign;
  quantity: number;
  id?: string; // Backend cart item ID
  customText?: string;
  customImageUrl?: string;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  total: number;
  lastSyncTime: number;
  addItem: (product: Product, quantity?: number, isAuthenticated?: boolean) => Promise<void>;
  removeItem: (productId: string, isAuthenticated?: boolean) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, isAuthenticated?: boolean) => Promise<void>;
  clearCart: (isAuthenticated?: boolean) => Promise<void>;
  syncWithBackend: (force?: boolean) => Promise<void>;
  mergeLocalCartWithBackend: () => Promise<void>;
  setItems: (items: CartItem[]) => void;
  getTotal: () => number;
  getItemCount: () => number;
  getItemQuantity: (productId: string) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      lastSyncTime: 0,
      get total() {
        return get().items.reduce((sum, item) => {
          const price = item.product?.price || item.customDesign?.estimatedPrice || 0;
          return sum + price * item.quantity;
        }, 0);
      },

      addItem: async (product, quantity = 1, isAuthenticated = false) => {
        if (isAuthenticated) {
          // Optimistic update - update UI immediately
          set((state) => {
            const existingItem = state.items.find(
              (item) => item.product?.id === product.id
            );
            if (existingItem) {
              return {
                items: state.items.map((item) =>
                  item.product?.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                ),
              };
            }
            return {
              items: [...state.items, { product, quantity }],
            };
          });

          // Sync with backend in background
          try {
            await apiClient.addToCart(product.id, quantity);
            // Quick sync to get backend cart item ID
            await get().syncWithBackend(true);
          } catch (error: any) {
            console.error('Failed to add item to backend cart:', error);
            // Don't revert on 401 - keep item in local cart for fallback
            // Only revert on other errors (product not found, out of stock, etc.)
            if (!error.message?.includes('401')) {
              set((state) => ({
                items: state.items.filter((item) => item.product?.id !== product.id),
              }));
            } else {
              console.log('Cart saved locally - will sync when authenticated');
            }
          }
        } else {
          // Local cart for non-authenticated users
          set((state) => {
            const existingItem = state.items.find(
              (item) => item.product?.id === product.id
            );
            if (existingItem) {
              return {
                items: state.items.map((item) =>
                  item.product?.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                ),
              };
            }
            return {
              items: [...state.items, { product, quantity }],
            };
          });
        }
      },

      removeItem: async (productId, isAuthenticated = false) => {
        if (isAuthenticated) {
          // Optimistic update - remove from UI immediately
          const itemToRemove = get().items.find((item) => item.product?.id === productId || item.customDesign?.id === productId);
          set((state) => ({
            items: state.items.filter((item) => item.product?.id !== productId && item.customDesign?.id !== productId),
          }));

          // Sync with backend in background
          try {
            if (itemToRemove?.id) {
              await apiClient.removeFromCart(itemToRemove.id);
            }
          } catch (error) {
            console.error('Failed to remove item from backend cart:', error);
            // Revert optimistic update on error
            if (itemToRemove) {
              set((state) => ({
                items: [...state.items, itemToRemove],
              }));
            }
            throw error;
          }
        } else {
          set((state) => ({
            items: state.items.filter((item) => item.product?.id !== productId && item.customDesign?.id !== productId),
          }));
        }
      },

      updateQuantity: async (productId, quantity, isAuthenticated = false) => {
        if (quantity <= 0) {
          await get().removeItem(productId, isAuthenticated);
          return;
        }

        if (isAuthenticated) {
          // Optimistic update - update UI immediately
          const oldItem = get().items.find((item) => item.product?.id === productId || item.customDesign?.id === productId);
          set((state) => ({
            items: state.items.map((item) =>
              item.product?.id === productId || item.customDesign?.id === productId ? { ...item, quantity } : item
            ),
          }));

          // Sync with backend in background
          try {
            if (oldItem?.id) {
              await apiClient.updateCartItem(oldItem.id, quantity);
            }
          } catch (error) {
            console.error('Failed to update cart item in backend:', error);
            // Revert optimistic update on error
            if (oldItem) {
              set((state) => ({
                items: state.items.map((item) =>
                  item.product?.id === productId || item.customDesign?.id === productId ? { ...item, quantity: oldItem.quantity } : item
                ),
              }));
            }
            throw error;
          }
        } else {
          set((state) => ({
            items: state.items.map((item) =>
              item.product?.id === productId || item.customDesign?.id === productId ? { ...item, quantity } : item
            ),
          }));
        }
      },

      clearCart: async (isAuthenticated = false) => {
        if (isAuthenticated) {
          // Optimistic update - clear UI immediately
          const oldItems = get().items;
          set({ items: [] });

          // Sync with backend in background
          try {
            await apiClient.clearCart();
          } catch (error) {
            console.error('Failed to clear backend cart:', error);
            // Revert on error
            set({ items: oldItems });
            throw error;
          }
        } else {
          set({ items: [] });
        }
      },

      syncWithBackend: async (force = false) => {
        // Skip sync if recently synced (within 5 seconds) unless forced
        const now = Date.now();
        const timeSinceLastSync = now - get().lastSyncTime;
        if (!force && timeSinceLastSync < 5000) {
          return;
        }

        try {
          // Silently skip sync if request fails (user not authenticated)
          const response = await apiClient.getCart();
          if (response.cart) {
            const backendItems: CartItem[] = (response.cart.items || []).map((item: any) => {
              const cartItem: CartItem = {
                id: item.id,
                quantity: item.quantity,
              };

              // Handle product items
              if (item.product) {
                cartItem.product = {
                  id: item.product.id,
                  name: item.product.name,
                  description: item.product.description,
                  price: Number(item.product.price),
                  originalPrice: item.product.originalPrice ? Number(item.product.originalPrice) : undefined,
                  stock: item.product.stock || 0,
                  category: item.product.category || {
                    id: 'default',
                    name: 'Product',
                    slug: 'product',
                    image: '',
                    description: '',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  images: item.product.images?.map((img: any) => img.url) || ['/placeholder-product.jpg'],
                  rating: item.product.rating || 4.5,
                  reviews: item.product.reviews || 0,
                  inStock: item.product.isActive !== false,
                  featured: false,
                  customizable: false,
                  material: item.product.material,
                  dimensions: item.product.dimensions,
                  weight: item.product.weight,
                  tags: item.product.tags || [],
                  isActive: item.product.isActive !== false,
                  createdAt: item.product.createdAt || new Date(),
                };
              }

              // Handle custom design items
              if (item.customDesign) {
                cartItem.customDesign = {
                  id: item.customDesign.id,
                  name: item.customDesign.name,
                  description: item.customDesign.description,
                  material: item.customDesign.material,
                  color: item.customDesign.color,
                  estimatedPrice: item.customDesign.estimatedPrice ? Number(item.customDesign.estimatedPrice) : undefined,
                  fileUrl: item.customDesign.fileUrl,
                  status: item.customDesign.status,
                  modelWeightGrams: item.customDesign.modelWeightGrams ? Number(item.customDesign.modelWeightGrams) : undefined,
                  totalWeightGrams: item.customDesign.totalWeightGrams ? Number(item.customDesign.totalWeightGrams) : undefined,
                  infillPercentage: item.customDesign.infillPercentage,
                  extruderCount: item.customDesign.extruderCount,
                  createdAt: item.customDesign.createdAt || new Date(),
                };
              }

              return cartItem;
            });
            set({ items: backendItems, lastSyncTime: now });
          }
        } catch (error: any) {
          // Silently fail if 401 (not authenticated), log other errors
          if (!error.message?.includes('401')) {
            console.error('Failed to sync cart with backend:', error);
          }
        }
      },

      mergeLocalCartWithBackend: async () => {
        try {
          const localItems = get().items;
          
          // If no local items, just sync with backend
          if (localItems.length === 0) {
            await get().syncWithBackend();
            return;
          }

          // Get backend cart
          const response = await apiClient.getCart();
          const backendItems = response.cart?.items || [];

          // Create a map of backend items by product ID
          const backendMap = new Map(
            backendItems.map((item: any) => [item.product?.id || item.customDesign?.id, item])
          );

          // Add or update local items to backend
          for (const localItem of localItems) {
            const itemId = localItem.product?.id || localItem.customDesign?.id;
            if (!itemId) continue;
            
            const backendItem = backendMap.get(itemId) as any;
            
            if (backendItem && backendItem.id) {
              // Item exists in backend, sync quantity to match local state
              await apiClient.updateCartItem(backendItem.id, localItem.quantity);
            } else if (localItem.product?.id) {
              // Item doesn't exist in backend, add it (only for products)
              await apiClient.addToCart(localItem.product.id, localItem.quantity);
            }
          }

          // Sync with backend to get the final merged state
          await get().syncWithBackend();
        } catch (error) {
          console.error('Failed to merge local cart with backend:', error);
          // On error, just sync with backend
          await get().syncWithBackend();
        }
      },

      setItems: (items) => {
        set({ items });
      },

      getTotal: () => {
        return get().items.reduce(
          (total, item) => {
            const price = item.product?.price || item.customDesign?.estimatedPrice || 0;
            return total + price * item.quantity;
          },
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      getItemQuantity: (productId) => {
        const item = get().items.find((item) => item.product?.id === productId || item.customDesign?.id === productId);
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'robohatch-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        items: state.items,
        // Don't persist lastSyncTime, isLoading, or computed values
      }),
      skipHydration: false,
    }
  )
);
