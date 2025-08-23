// app/test-auth/page.tsx
// Test page to verify Auth0 + Supabase integration

import { auth0 } from '@/lib/auth0'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export default async function TestAuthPage() {
  // Get Auth0 session
  const session = await auth0.getSession()
  
  if (!session) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
        <p className="mb-4">You are not logged in.</p>
        <a 
          href="/auth/login" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Login with Auth0
        </a>
      </div>
    )
  }

  // Get Supabase client with Auth0 token
  const supabase = await createSupabaseServerClient()
  
  // Test a simple query (you can customize this based on your tables)
  let supabaseData = null
  let supabaseError = null
  
  try {
    // Try a simple query - replace with your actual table
    const { data, error } = await supabase
      .from('user_refreshes') // Using refresh table since we migrated it
      .select('*')
      .limit(5)
    
    supabaseData = data
    supabaseError = error
  } catch (error) {
    supabaseError = error
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth0 + Supabase Test Page</h1>
      
      <div className="space-y-6">
        {/* Auth0 User Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-3">✅ Auth0 User Session</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {session.user.name}</p>
            <p><strong>Email:</strong> {session.user.email}</p>
            <p><strong>Auth0 ID (sub):</strong> {session.user.sub}</p>
            <p><strong>Picture:</strong> {session.user.picture}</p>
          </div>
        </div>

        {/* Supabase Connection Test */}
        <div className={`border rounded-lg p-4 ${supabaseError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          <h2 className={`text-lg font-semibold mb-3 ${supabaseError ? 'text-red-800' : 'text-blue-800'}`}>
            {supabaseError ? '❌' : '✅'} Supabase Connection Test
          </h2>
          
          {supabaseError ? (
            <div className="text-sm text-red-700">
              <p><strong>Error:</strong> {supabaseError instanceof Error ? supabaseError.message : 'Unknown error'}</p>
              <p className="mt-2">This might be expected if:</p>
              <ul className="list-disc list-inside mt-1">
                <li>You haven't configured Supabase to accept Auth0 tokens yet</li>
                <li>The user_refreshes table doesn't exist</li>
                <li>RLS policies are blocking access</li>
              </ul>
            </div>
          ) : (
            <div className="text-sm text-blue-700">
              <p><strong>Success!</strong> Supabase accepted the Auth0 token.</p>
              <p><strong>Records found:</strong> {supabaseData?.length || 0}</p>
              {supabaseData && supabaseData.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">View data</summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify(supabaseData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* JWT Token Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">🔑 Token Debug Info</h2>
          <p className="text-sm text-gray-600 mb-2">
            Visit <code>/api/debug/token</code> to see the Auth0 access token claims
          </p>
          <a 
            href="/api/debug/token" 
            className="inline-block bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
          >
            View Token Claims
          </a>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <a 
            href="/" 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            ← Back to Home
          </a>
          <a 
            href="/auth/logout" 
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </a>
        </div>
      </div>
    </div>
  )
}