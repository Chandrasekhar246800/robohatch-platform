import { create } from 'zustand';
import { useCartStore } from './cart.store';
import { clearCsrfTokenMemory } from '@/lib/csrf-token';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt?: string | Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authStatus: 'checking' | 'authenticated' | 'unauthenticated';
  _hasHydrated: boolean;
  _lastLoginTime: number;
  setAuth: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setHasHydrated: (state: boolean) => void;
  setAuthStatus: (status: AuthState['authStatus']) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  authStatus: 'checking',
  _hasHydrated: false,
  _lastLoginTime: 0,
  setAuth: (user) => {
    const now = Date.now();
    set({ user, isAuthenticated: true, authStatus: 'authenticated', _lastLoginTime: now, _hasHydrated: true });
    console.log('[AuthStore] Session confirmed at:', now);

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
    set({ user: null, isAuthenticated: false, authStatus: 'unauthenticated', _hasHydrated: true });
    clearCsrfTokenMemory();
    // Clear cart on logout (both backend flag set to false and clear local)
    useCartStore.getState().clearCart(false);
  },
  updateUser: (user) => set({ user }),
  setHasHydrated: (state) => set({ _hasHydrated: state }),
  setAuthStatus: (status) => set({ authStatus: status }),
}));
