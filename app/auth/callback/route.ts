// This file is no longer needed with Auth0 integration
// Auth0 handles callbacks automatically at /auth/callback via middleware
// If you need custom post-login logic, implement it in an Auth0 Action

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Redirect to Auth0's callback handler
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/auth/callback`)
}