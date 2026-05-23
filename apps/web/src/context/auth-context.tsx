'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

    try {
      const response = await apiClient.getProfile();

      if (response.success && response.data?.user) {
        setAuth(response.data.user);
        runPostAuthSync();
        return true;
      }

      logoutStore();
      resetWishlist();
      return false;
    } catch (error: any) {
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
    }
  }, [isAuthenticated, logoutStore, resetWishlist, runPostAuthSync, setAuth, setAuthStatus, setHasHydrated]);

  const refreshSession = useCallback(async () => {
    try {
      const refreshed = await apiClient.refreshSession();

      if (refreshed.success && refreshed.data?.user) {
        setAuth(refreshed.data.user);
        runPostAuthSync();
        setAuthStatus('authenticated');
        return true;
      }

      logoutStore();
      return false;
    } catch (error) {
      logoutStore();
      return false;
    }
  }, [runPostAuthSync, setAuth, setAuthStatus]);

  const bootstrapCsrf = useCallback(async () => {
    await apiClient.ensureCsrfToken();
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    logoutStore();
    resetWishlist();
    setAuthStatus('unauthenticated');
  }, [logoutStore, resetWishlist, setAuthStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void bootstrapCsrf().finally(() => {
        void validateSession();
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [bootstrapCsrf, validateSession]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated,
    authStatus,
    isLoading: authStatus === 'checking',
    refreshSession,
    logout,
    validateSession,
  }), [authStatus, isAuthenticated, logout, refreshSession, user, validateSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}