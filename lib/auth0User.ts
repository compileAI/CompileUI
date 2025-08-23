// lib/auth0User.ts
import { auth0 } from './auth0'

/**
 * Get the current Auth0 user session
 * This replaces supabase.auth.getUser() calls
 */
export async function getAuth0User() {
  try {
    const session = await auth0.getSession()
    return {
      user: session?.user || null,
      error: null
    }
  } catch (error) {
    console.error('Error getting Auth0 user:', error)
    return {
      user: null,
      error: error
    }
  }
}

/**
 * Get Auth0 user ID (sub claim) - this replaces user.id from Supabase
 */
export async function getAuth0UserId(): Promise<string | null> {
  const { user } = await getAuth0User()
  return user?.sub || null
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { user } = await getAuth0User()
  return !!user
}

/**
 * Get user for API route authentication (non-middleware)
 * Use this in API routes instead of supabase.auth.getUser()
 */
export async function getApiUser() {
  const { user, error } = await getAuth0User()
  
  if (error || !user) {
    return {
      data: { user: null },
      error: error || new Error('No authenticated user')
    }
  }
  
  return {
    data: { user },
    error: null
  }
}