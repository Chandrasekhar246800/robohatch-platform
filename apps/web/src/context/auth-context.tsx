'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient, AuthenticationError, NetworkError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';

type AuthContextValue = {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  isAuthenticated: boolean;
  authStatus: 'checking' | 'authenticated' | 'unauthenticated';
  isLoading: boolean;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authStatus = useAuthStore((state) => state.authStatus);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logoutStore = useAuthStore((state) => state.logout);
  const setHasHydrated = useAuthStore((state) => state.setHasHydrated);
  const setAuthStatus = useAuthStore((state) => state.setAuthStatus);
  const syncWithBackend = useCartStore((state) => state.syncWithBackend);
  const { fetchWishlist, reset: resetWishlist } = useWishlistStore();

  const runPostAuthSync = useCallback(() => {
    syncWithBackend(true).catch((error) => {
      console.error('Background cart sync failed:', error);
    });
    fetchWishlist(true).catch((error) => {
      console.error('Background wishlist fetch failed:', error);
    });
  }, [fetchWishlist, syncWithBackend]);

  const validateSession = useCallback(async () => {
    setAuthStatus('checking');
    console.log('[AuthHydration] validateSession:start', {
      pathname,
      isAuthenticated,
      status: useAuthStore.getState().authStatus,
      hydrated: useAuthStore.getState()._hasHydrated,
    });

    try {
      const response = await apiClient.getProfile();
      console.log('[AuthHydration] validateSession:profile response', {
        success: response.success,
        hasUser: !!response.data?.user,
      });

      if (response.success && response.data?.user) {
        setAuth(response.data.user);
        runPostAuthSync();
        console.log('[AuthHydration] validateSession:authenticated', {
          userId: response.data.user.id,
        });
        return true;
      }

      logoutStore();
      resetWishlist();
      console.log('[AuthHydration] validateSession:unauthenticated', {
        reason: 'profile response missing user',
      });
      return false;
    } catch (error: any) {
      console.log('[AuthHydration] validateSession:error', {
        name: error?.name,
        message: error?.message,
      });
      if (error instanceof AuthenticationError) {
        logoutStore();
        resetWishlist();
        return false;
      }

      if (error instanceof NetworkError) {
        // Keep any in-memory session state intact when the API is temporarily unreachable.
        return isAuthenticated;
      }

      logoutStore();
      resetWishlist();
      return false;
    } finally {
      setHasHydrated(true);
      setAuthStatus(useAuthStore.getState().isAuthenticated ? 'authenticated' : 'unauthenticated');
      console.log('[AuthHydration] validateSession:final', {
        pathname,
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        status: useAuthStore.getState().authStatus,
        hydrated: useAuthStore.getState()._hasHydrated,
      });
    }
  }, [isAuthenticated, logoutStore, resetWishlist, runPostAuthSync, setAuth, setAuthStatus, setHasHydrated]);

  const refreshSession = useCallback(async () => {
    console.log('[AuthHydration] refreshSession:start', {
      pathname,
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      status: useAuthStore.getState().authStatus,
    });
    try {
      const refreshed = await apiClient.refreshSession();

      if (refreshed.success && refreshed.data?.user) {
        setAuth(refreshed.data.user);
        runPostAuthSync();
        setAuthStatus('authenticated');
        console.log('[AuthHydration] refreshSession:authenticated', {
          userId: refreshed.data.user.id,
        });
        return true;
      }

      logoutStore();
      console.log('[AuthHydration] refreshSession:failed', {
        message: refreshed.message,
      });
      return false;
    } catch (error) {
      if (error instanceof NetworkError) {
        console.log('[AuthHydration] refreshSession:rate-limited', {
          message: error.message,
        });
        return isAuthenticated;
      }

      logoutStore();
      console.log('[AuthHydration] refreshSession:error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }, [pathname, runPostAuthSync, setAuth, setAuthStatus]);

  const bootstrapCsrf = useCallback(async () => {
    await apiClient.ensureCsrfToken();
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    logoutStore();
    resetWishlist();
    setAuthStatus('unauthenticated');
  }, [logoutStore, resetWishlist, setAuthStatus]);

  const shouldBootstrapAuth = useMemo(() => {
    if (!pathname) {
      return false;
    }

    return (
      pathname.startsWith('/account') ||
      pathname.startsWith('/orders') ||
      pathname.startsWith('/wishlist') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/upload-3d-file')
    );
  }, [pathname]);

  useEffect(() => {
    if (!shouldBootstrapAuth) {
      setHasHydrated(true);
      setAuthStatus(isAuthenticated ? 'authenticated' : 'unauthenticated');
      return;
    }

    setHasHydrated(false);
    setAuthStatus('checking');
    console.log('[AuthHydration] bootstrap start', {
      pathname,
      isAuthenticated,
      authStatus,
      shouldBootstrapAuth,
    });

    const timer = setTimeout(() => {
      void bootstrapCsrf().finally(() => {
        void validateSession();
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      console.log('[AuthHydration] bootstrap cancelled', {
        pathname,
        isAuthenticated,
        authStatus,
      });
    };
  }, [authStatus, bootstrapCsrf, isAuthenticated, pathname, setAuthStatus, setHasHydrated, shouldBootstrapAuth, validateSession]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated,
    authStatus,
    isLoading: authStatus === 'checking',
    refreshSession,
    logout,
    validateSession,
  }), [authStatus, isAuthenticated, logout, refreshSession, user, validateSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    (window as any).__E2E_AUTH_STATE__ = {
      status: authStatus,
      hydrated: authStatus !== 'checking',
      isAuthenticated,
      pathname,
    };
  }, [authStatus, isAuthenticated, pathname]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}