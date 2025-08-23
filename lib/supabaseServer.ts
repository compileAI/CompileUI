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
    // Get Auth0 access token for the current session
    const tokenResult = await auth0.getAccessToken({
      // Uncomment the next line if you didn't set a Default Audience in Auth0:
      // audience: process.env.AUTH0_AUDIENCE,
    })

    const accessToken = tokenResult?.token

    if (!accessToken) {
      // User not logged in - return client without auth headers
      // This will still work for public data but RLS will block user-specific data
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
    console.error('Error creating Supabase server client:', error)
    // Fallback to unauthenticated client
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