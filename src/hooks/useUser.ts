'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { User } from '@/types';

export function useUser() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const prevSessionKeyRef = useRef<string>('');
  const sessionDataRef = useRef<{ user: typeof session.user | null; status: string }>({ user: null, status: 'loading' });

  // Update refs synchronously (outside useEffect) to avoid dependency issues
  sessionDataRef.current = {
    user: session?.user || null,
    status: status || 'loading',
  };

  // Create a stable session key that won't change unless session actually changes
  const sessionKey = useMemo(() => {
    const currentStatus = sessionDataRef.current.status;
    const currentUser = sessionDataRef.current.user;
    
    if (currentStatus === 'loading') return 'loading';
    if (!currentUser) return 'no-session';
    return `${currentUser.id}|${currentUser.email || ''}|${currentUser.name || ''}|${currentUser.role || ''}`;
  }, [session?.user?.id, session?.user?.email, session?.user?.name, session?.user?.role, status]);

  const fetchUserCoins = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/user/coins', {
        cache: 'no-store',
        credentials: 'include',
        signal,
      });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        setUser((prev) => prev ? { ...prev, coins: data.coins } : null);
      }
    } catch (error) {
      // Ignore abort errors during navigation
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to fetch coins:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const currentStatus = sessionDataRef.current.status;
    const currentUser = sessionDataRef.current.user;
    
    if (currentStatus === 'loading' || sessionKey === 'loading') {
      return;
    }
    
    // Only update if the session key actually changed
    if (sessionKey !== prevSessionKeyRef.current) {
      prevSessionKeyRef.current = sessionKey;
      
      const abortController = new AbortController();
      
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          coins: 0, // Will be fetched separately
          role: currentUser.role,
        });
        fetchUserCoins(abortController.signal);
      } else {
        setUser(null);
        setLoading(false);
      }
      
      return () => {
        abortController.abort();
      };
    }
  }, [sessionKey, fetchUserCoins]);

  return {
    user,
    isAuthenticated: !!session,
    isLoading: loading || status === 'loading',
    refresh: fetchUserCoins,
  };
}


