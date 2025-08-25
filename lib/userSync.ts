// lib/userSync.ts
// Helper to sync Auth0 users with Supabase users table

import { createSupabaseServerClient } from './supabaseServer'
import { auth0 } from './auth0'



/**
 * Ensures a user exists in Supabase users table
 * Call this after Auth0 login to sync user data
 */
export async function ensureUserExists(): Promise<boolean> {
  try {
    // Get Auth0 user
    const session = await auth0.getSession()
    if (!session?.user) {
      console.log('No Auth0 session found')
      return false
    }

    const { sub, email, name, picture } = session.user
    
    // Handle missing email (common with GitHub when email is private)
    const userEmail = email || `${sub}@auth0.local`
    console.log(`Syncing user: ${userEmail} (${sub}) [email was ${email ? 'provided' : 'missing'}]`)

    // Get Supabase client
    const supabase = await createSupabaseServerClient()

    // Call the Postgres function to create/update user
    const { data, error } = await supabase.rpc('create_user_if_not_exists', {
      auth0_user_id: sub,
      user_email: userEmail,
      user_name: name || null,
      user_avatar: picture || null
    })

    if (error) {
      console.error('Error syncing user:', error)
      
      // Try a direct insert as a fallback
      console.log('Attempting direct user insert as fallback...')
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: sub,
          email: userEmail, // Use the fallback email here too
          name: name || null,
          avatar_url: picture || null,
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Direct insert also failed:', insertError)
        return false
      }
      
      console.log('Direct user insert succeeded')
      return true
    }

    console.log('User synced successfully via function:', data?.email)
    return true

  } catch (error) {
    console.error('Error in ensureUserExists:', error)
    return false
  }
}

/**
 * Get current user from Supabase users table (with app-specific data)
 */
export async function getCurrentUser() {
  try {
    const session = await auth0.getSession()
    if (!session?.user) {
      return null
    }

    const supabase = await createSupabaseServerClient()
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.sub)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return user

  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

/**
 * Update user profile in Supabase
 */
export async function updateUserProfile(updates: {
  name?: string
  bio?: string
  preferences?: Record<string, unknown>
  subscription_tier?: string
  onboarding_completed?: boolean
}) {
  try {
    const session = await auth0.getSession()
    if (!session?.user) {
      throw new Error('Not authenticated')
    }

    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.sub)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data

  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}