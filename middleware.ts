// middleware.ts (single file)
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { auth0 } from './lib/auth0' // <-- add this

export async function middleware(request: NextRequest) {
  // 1) Let Auth0 handle its built-in routes
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return auth0.middleware(request) // returns redirects/responses for /auth/*
  }

  // 2) Your existing Supabase SSR middleware
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Note: With Auth0 integration, we don't need to check supabase.auth.getUser() here
  // Auth0 handles authentication via JWT tokens passed to Supabase
  // The supabase client is only used for cookie management in SSR context
  
  return supabaseResponse
}

// Keep your matcher wide so both /auth/* and app paths go through middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
