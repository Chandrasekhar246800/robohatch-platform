import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './cart.store';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  _lastLoginTime: number;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      _lastLoginTime: 0,
      setAuth: (user, token) => {
        const now = Date.now();
        set({ user, isAuthenticated: true, _lastLoginTime: now });
        console.log('[AuthStore] Login completed at:', now);

        // Merge local cart with backend after login (non-blocking for faster login)
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            useCartStore.getState().mergeLocalCartWithBackend()
              .catch(error => {
                console.error('Failed to merge cart on login:', error);
                // Even if merge fails, force sync with backend
                useCartStore.getState().syncWithBackend(true);
              });
          }, 0);
        }
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
        // Clear the auth cookie
        if (typeof window !== 'undefined') {
          document.cookie = 'isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        // Clear cart on logout (both backend flag set to false and clear local)
        useCartStore.getState().clearCart(false);
      },
      updateUser: (user) => set({ user }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
