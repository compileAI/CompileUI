"use client";

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useUser } from '@auth0/nextjs-auth0';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  error: any;
  isAuthenticated: boolean;
  hasSynced: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, isLoading, error } = useUser();
  const hasSynced = useRef(false);
  const sessionId = useRef<string | null>(null);

  // Auto-sync user when they log in (moved from useAutoUserSync)
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

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    hasSynced: hasSynced.current
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
