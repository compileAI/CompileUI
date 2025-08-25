// hooks/useAutoUserSync.ts
// Custom hook to automatically sync Auth0 users with Supabase

import { useEffect, useRef } from 'react';
import { useUser } from '@auth0/nextjs-auth0';

export function useAutoUserSync() {
  const { user, isLoading } = useUser();
  const hasSynced = useRef(false);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    // Only sync once per user session and only when user is authenticated
    if (user && !isLoading && !hasSynced.current && sessionId.current !== user.sub) {
      hasSynced.current = true;
      sessionId.current = user.sub;
      
      console.log('Auto-syncing user (once per session):', user.email);
      
      // Call sync-user endpoint to ensure user exists in Supabase
      fetch('/api/sync-user', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('✅ User auto-synced successfully:', data.user?.email);
          } else {
            console.warn('⚠️ User auto-sync failed:', data.error);
            // Reset flag so it can retry on next component mount
            hasSynced.current = false;
            sessionId.current = null;
          }
        })
        .catch(error => {
          console.error('❌ User auto-sync error:', error);
          // Reset flag so it can retry on next component mount
          hasSynced.current = false;
          sessionId.current = null;
        });
    }
  }, [user, isLoading]);

  // Reset sync flag when user logs out
  useEffect(() => {
    if (!user && !isLoading) {
      hasSynced.current = false;
      sessionId.current = null;
    }
  }, [user, isLoading]);

  return {
    user,
    isLoading,
    hasSynced: hasSynced.current
  };
}