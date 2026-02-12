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
  const { isAuthenticated, setAuth, logout, user } = useAuthStore();
  const syncWithBackend = useCartStore((state) => state.syncWithBackend);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated && user) {
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
          // Only logout if it's an authentication error, not network errors
          if (error.message?.includes('401') || error.message?.includes('Authentication')) {
            console.warn('Auth validation failed, logging out');
            logout();
          } else {
            console.error('Profile check failed, but keeping session:', error.message);
          }
        }
      }
    };

    // Add small delay to allow cookies to be set after login
    const timer = setTimeout(() => {
      initAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.id]); // Only re-run when auth status or user ID changes

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
