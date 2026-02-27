'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { apiClient, AuthenticationError, NetworkError } from '@/lib/api-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, logout, user, _lastLoginTime } = useAuthStore();
  const syncWithBackend = useCartStore((state) => state.syncWithBackend);
  const { fetchWishlist, reset: resetWishlist } = useWishlistStore();

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated && user) {
        // Skip validation if login happened within last 5 seconds (cookie propagation time)
        const timeSinceLogin = Date.now() - _lastLoginTime;
        if (timeSinceLogin < 5000) {
          console.log('[AuthInitializer] Skipping validation - login too recent:', timeSinceLogin, 'ms');
          return;
        }
        
        try {
          const response = await apiClient.getProfile();
          if (response.success && response.data) {
            // Update user data if it changed
            if (response.data.email !== user.email || response.data.role !== user.role) {
              setAuth(response.data, '');
            }
            // User still valid, force sync cart from database (non-blocking)
            syncWithBackend(true).catch(err => {
              console.error('Background cart sync failed:', err);
            });
            // Fetch wishlist data (non-blocking)
            fetchWishlist(true).catch(err => {
              console.error('Background wishlist fetch failed:', err);
            });
          } else {
            // Profile fetch succeeded but returned invalid data - logout
            console.warn('Profile validation failed (invalid response), logging out');
            logout();
            resetWishlist();
          }
        } catch (error: any) {
          // Handle different error types
          if (error instanceof AuthenticationError) {
            // Authentication failed (401) - token is invalid, logout required
            console.warn('Authentication failed (token invalid/expired), logging out:', error.message);
            logout();
            resetWishlist();
            apiClient.handleAuthenticationFailure(error.message);
          } else if (error instanceof NetworkError) {
            // Network error - don't logout, keep existing session
            // User might be temporarily offline or API might be down
            console.warn('Network error during auth validation, keeping session:', error.message);
            console.log('User can continue using cached data. Will retry validation on next navigation.');
          } else {
            // Unknown error - be conservative and keep the session
            // This could be a temporary issue
            console.error('Unknown error during auth validation, keeping session:', error);
          }
        }
      } else {
        // User not authenticated, reset wishlist
        resetWishlist();
      }
    };

    // Wait for cookie propagation across domains (Vercel -> Railway)
    const timer = setTimeout(() => {
      initAuth();
    }, 3000); // Increased to 3000ms for better cross-domain cookie propagation

    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.id, _lastLoginTime]); // Re-run when auth status, user ID, or login time changes

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </QueryClientProvider>
  );
}
