// lib/auth0Client.ts
// Client-side Auth0 helpers for components that need to work with Auth0

/**
 * Simple auth helpers for client components
 * Use these instead of direct Supabase auth calls
 */

export const auth0ClientHelpers = {
  /**
   * Redirect to Auth0 login
   */
  signIn: () => {
    window.location.href = '/auth/login';
  },

  /**
   * Redirect to Auth0 logout
   */
  signOut: () => {
    window.location.href = '/auth/logout';
  },

  /**
   * Check if user is currently on an auth page
   */
  isOnAuthPage: () => {
    return window.location.pathname.startsWith('/auth/');
  }
};

/**
 * Migration helper: Use this to replace supabase auth calls in client components
 * 
 * Example usage:
 * 
 * Before:
 * await supabase.auth.signOut();
 * 
 * After:
 * auth0ClientHelpers.signOut();
 */