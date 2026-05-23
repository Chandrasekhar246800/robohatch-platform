'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  clearCsrfTokenMemory,
  getCsrfTokenMemory,
  setCsrfTokenMemory,
  subscribeCsrfTokenMemory,
  type CsrfToken,
} from '@/lib/csrf-token';
import { AuthProvider } from '@/context/auth-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

type CsrfContextValue = {
  csrfToken: CsrfToken;
  setCsrfToken: (token: string) => void;
  clearCsrfToken: () => void;
};

const CsrfContext = createContext<CsrfContextValue | undefined>(undefined);

export function useCsrfToken() {
  const context = useContext(CsrfContext);

  if (!context) {
    throw new Error('useCsrfToken must be used within Providers');
  }

  return context;
}

function CsrfProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCsrfTokenState] = useState<CsrfToken>(getCsrfTokenMemory());

  useEffect(() => {
    return subscribeCsrfTokenMemory(setCsrfTokenState);
  }, []);

  const setCsrfToken = (token: string) => {
    // Keep the CSRF token in memory only. HttpOnly cookies cannot be read by JS,
    // so the backend returns the token in JSON and this provider owns the runtime copy.
    setCsrfTokenMemory(token);
    setCsrfTokenState(token);
  };

  const clearCsrfToken = () => {
    clearCsrfTokenMemory();
    setCsrfTokenState(null);
  };

  return (
    <CsrfContext.Provider value={{ csrfToken, setCsrfToken, clearCsrfToken }}>
      {children}
    </CsrfContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CsrfProvider>
          {children}
        </CsrfProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
