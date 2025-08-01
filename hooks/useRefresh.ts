import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface RefreshState {
  refreshesRemaining: number;
  isLoading: boolean;
  isDisabled: boolean;
}

export function useRefresh() {
  const [state, setState] = useState<RefreshState>({
    refreshesRemaining: 3,
    isLoading: false,
    isDisabled: false
  });
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // Monitor auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        // Fetch current refresh count when user is authenticated
        fetchRefreshCount();
      } else {
        // Reset state when user is not authenticated
        setState(prev => ({
          ...prev,
          refreshesRemaining: 3,
          isDisabled: true
        }));
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const fetchRefreshCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/refresh', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          refreshesRemaining: data.refreshesRemaining,
          isDisabled: data.refreshesRemaining <= 0
        }));
      }
    } catch (error) {
      console.error('Error fetching refresh count:', error);
    }
  }, [user]);

  const refresh = useCallback(async (preventReload: boolean = false) => {
    if (!user || state.isDisabled || state.isLoading) {
      return { refreshesRemaining: state.refreshesRemaining };
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Clear the discover cache
        localStorage.removeItem("compile-discover-articles");
        
        // Clear high-level summaries cache on server-side
        try {
          await fetch('/api/cache/invalidate-summaries', { method: 'POST' });
        } catch (e) {
          console.warn('Failed to invalidate summaries cache:', e);
        }
        
        window.dispatchEvent(new CustomEvent('cacheUpdated', { detail: null }));
        
        // Update state
        const newRefreshesRemaining = data.refreshesRemaining;
        setState(prev => ({
          ...prev,
          refreshesRemaining: newRefreshesRemaining,
          isDisabled: newRefreshesRemaining <= 0,
          isLoading: false
        }));
        
        if (!preventReload) {
        toast.success('Cache cleared successfully!');
          // Reload the page to show fresh content
          window.location.reload();
        }
        
        return { refreshesRemaining: newRefreshesRemaining };
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        
        if (response.status === 429) {
          const errorMessage = 'Daily refresh limit reached. Try again tomorrow.';
          if (!preventReload) {
            toast.error(errorMessage);
          }
          throw new Error(errorMessage);
        } else {
          const errorMessage = data.error || 'Failed to refresh cache';
          if (!preventReload) {
            toast.error(errorMessage);
          }
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error refreshing cache:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      if (!preventReload) {
      toast.error('Failed to refresh cache. Please try again.');
      }
      throw error;
    }
  }, [user, state.isDisabled, state.isLoading, state.refreshesRemaining]);

  return {
    ...state,
    refresh,
    fetchRefreshCount,
    isAuthenticated: !!user
  };
} 