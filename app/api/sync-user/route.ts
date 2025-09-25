// app/api/sync-user/route.ts
// API route to sync Auth0 users with Supabase users table

import { NextResponse } from 'next/server'
import { ensureUserExists } from '@/lib/userSync'
import { auth0 } from '@/lib/auth0'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    // Check if user is authenticated
    const session = await auth0.getSession()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Sync user to Supabase
    const synced = await ensureUserExists()
    
    if (synced) {
      return NextResponse.json({
        success: true,
        message: 'User synced successfully',
        user: {
          id: session.user.sub,
          email: session.user.email,
          name: session.user.name
        }
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to sync user' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('API /api/sync-user', 'Error syncing user', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}