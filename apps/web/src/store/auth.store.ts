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
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        // Sync token with localStorage for api-client
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
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
        set({ user: null, token: null, isAuthenticated: false });
        // Clear token from storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        // Clear cart on logout (both backend flag set to false and clear local)
        useCartStore.getState().clearCart(false);
      },
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
