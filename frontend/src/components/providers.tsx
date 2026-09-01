'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);
  useEffect(() => { initFromStorage(); }, [initFromStorage]);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e3a5f', color: '#fff', borderRadius: '8px' },
          success: { style: { background: '#065f46', color: '#fff' } },
          error: { style: { background: '#991b1b', color: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
