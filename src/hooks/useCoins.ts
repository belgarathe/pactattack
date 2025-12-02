'use client';

import { create } from 'zustand';

interface CoinsStore {
  balance: number;
  setBalance: (balance: number) => void;
  increment: (amount: number) => void;
  decrement: (amount: number) => void;
  refreshBalance: () => Promise<void>;
}

let refreshPromise: Promise<void> | null = null;

export const useCoins = create<CoinsStore>((set) => ({
  balance: 0,
  setBalance: (balance) => set({ balance }),
  increment: (amount) => set((state) => ({ balance: state.balance + amount })),
  decrement: (amount) => set((state) => ({ balance: Math.max(0, state.balance - amount) })),
  refreshBalance: async () => {
    // Prevent concurrent refresh calls
    if (refreshPromise) {
      return refreshPromise;
    }
    
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/user/coins', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          set({ balance: data.balance || 0 });
        }
      } catch (error) {
        // Ignore abort errors during navigation
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to refresh balance:', error);
        }
      } finally {
        refreshPromise = null;
      }
    })();
    
    return refreshPromise;
  },
}));

