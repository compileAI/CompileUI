// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js'
import { auth0 } from './auth0'

/**
 * Creates a Supabase client that uses Auth0 access tokens for authentication
 * This enables Supabase RLS policies to work with Auth0 user claims
 * This REPLACES your existing createClientForServer() function
 */
export async function createSupabaseServerClient() {
  try {
    // Check if user has an active session first
    const session = await auth0.getSession()
    
    if (!session || !session.user) {
      // No active session - return unauthenticated client for public data
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    // Get Auth0 access token for the current session
    const tokenResult = await auth0.getAccessToken({
      // Uncomment the next line if you didn't set a Default Audience in Auth0:
      // audience: process.env.AUTH0_AUDIENCE,
    })

    const accessToken = tokenResult?.token

    if (!accessToken) {
      // User logged in but no access token - return client without auth headers
      console.warn('User session exists but no access token available')
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    // Create Supabase client with Auth0 token
    // This token contains the 'role' and 'sub' claims that Supabase RLS can use
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    )

    return supabase
  } catch (error) {
    // Check if it's a "no session" error which is expected for unauthenticated users
    if (error && typeof error === 'object' && 'code' in error && error.code === 'missing_session') {
      // This is expected for unauthenticated users - return public client
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    
    console.error('Error creating Supabase server client:', error)
    // Fallback to unauthenticated client for any other error
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
}

/**
 * Server action helper - use this in your server actions
 */
export async function getAuthenticatedSupabase() {
  return await createSupabaseServerClient()
}