'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { apiClient } from '@/lib/api-client';

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

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated && user) {
        // Skip validation if login happened within last 3 seconds (cookie propagation time)
        const timeSinceLogin = Date.now() - _lastLoginTime;
        if (timeSinceLogin < 3000) {
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
          } else {
            // Token invalid, logout
            console.warn('Profile validation failed, logging out');
            logout();
          }
        } catch (error: any) {
          // Logout on ANY error - don't keep stale auth state
          console.warn('Auth validation failed, logging out:', error.message);
          logout();
        }
      }
    };

    // Wait longer to allow cookie to propagate across domains (Vercel -> Railway)
    const timer = setTimeout(() => {
      initAuth();
    }, 2000); // Increased to 2000ms for cross-domain cookie propagation

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
