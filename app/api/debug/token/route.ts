// app/api/debug/token/route.ts
// Debug endpoint to show Auth0 token claims

import { NextResponse } from 'next/server'
import { auth0 } from '@/lib/auth0'

export async function GET() {
  try {
    // Get Auth0 access token
    const tokenResult = await auth0.getAccessToken({
      // Uncomment if you didn't set a Default Audience in Auth0:
      // audience: process.env.AUTH0_AUDIENCE,
    })

    const accessToken = tokenResult?.token

    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'No access token found',
          message: 'User may not be logged in, or Auth0 is not configured properly',
          authenticated: false
        }, 
        { status: 401 }
      )
    }

    // Decode JWT payload (basic decode, no verification - just for debugging)
    try {
      const [header, payload] = accessToken.split('.')
      const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))

      return NextResponse.json({
        authenticated: true,
        message: 'Auth0 token found and decoded successfully',
        token_info: {
          header: decodedHeader,
          payload: decodedPayload,
          // Don't return the actual token in production for security
          token_preview: `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 20)}`,
          expires_at: new Date(decodedPayload.exp * 1000).toISOString(),
        },
        supabase_claims: {
          user_id: decodedPayload.sub,
          role: decodedPayload.role,
          email: decodedPayload.email,
          issuer: decodedPayload.iss,
          audience: decodedPayload.aud,
        },
        instructions: {
          next_steps: [
            'Check that "role" claim is set to "authenticated"',
            'Verify "iss" matches your Auth0 custom domain',
            'Ensure "aud" includes your API identifier',
            'Configure Supabase to accept Auth0 tokens in Dashboard → Auth → Third-party Auth'
          ]
        }
      })
    } catch (decodeError) {
      return NextResponse.json({
        error: 'Failed to decode token',
        message: 'Token format is invalid',
        decode_error: decodeError instanceof Error ? decodeError.message : 'Unknown decode error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Debug token error:', error)
    return NextResponse.json({
      error: 'Failed to get access token',
      message: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false
    }, { status: 500 })
  }
}