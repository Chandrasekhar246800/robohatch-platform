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
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  const syncWithBackend = useCartStore((state) => state.syncWithBackend);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated) {
        try {
          const response = await apiClient.getProfile();
          if (response.success && response.data) {
            // User still valid, force sync cart from database (non-blocking)
            syncWithBackend(true).catch(err => {
              console.error('Background cart sync failed:', err);
            });
          } else {
            // Token invalid, logout
            logout();
          }
        } catch (error) {
          // Token invalid, logout
          logout();
        }
      }
    };

    initAuth();
  }, [isAuthenticated]);

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
