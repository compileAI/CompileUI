// app/example-auth-usage.tsx
// This is an example file showing how to use Auth0 + Supabase integration
// You can delete this file after implementing your actual components

import { auth0 } from '@/lib/auth0'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

// Example: Server Component with Auth0 + Supabase
export default async function ExampleAuthPage() {
  // Get Auth0 session
  const session = await auth0.getSession()
  
  if (!session) {
    return (
      <div className="p-6">
        <h1>Please log in</h1>
        <a href="/auth/login" className="bg-blue-500 text-white px-4 py-2 rounded">
          Log in with Auth0
        </a>
      </div>
    )
  }

  // Get Supabase client with Auth0 token
  const supabase = await createSupabaseServerClient()
  
  // Example: Query Supabase with Auth0 authentication
  // This will work with RLS policies that check for 'authenticated' role and user sub
  try {
    const { data: todos, error } = await supabase
      .from('todos') // Replace with your actual table
      .select('*')
    
    if (error) {
      console.error('Supabase error:', error)
    }

    return (
      <div className="p-6">
        <h1>Welcome, {session.user.name}!</h1>
        <p>Email: {session.user.email}</p>
        <p>Auth0 ID: {session.user.sub}</p>
        
        <div className="mt-4">
          <a href="/auth/logout" className="bg-red-500 text-white px-4 py-2 rounded">
            Log out
          </a>
        </div>

        <div className="mt-6">
          <h2>Data from Supabase:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(todos, null, 2)}
          </pre>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error fetching data:', error)
    return (
      <div className="p-6">
        <h1>Welcome, {session.user.name}!</h1>
        <p>Error loading data from Supabase</p>
        <a href="/auth/logout" className="bg-red-500 text-white px-4 py-2 rounded">
          Log out
        </a>
      </div>
    )
  }
}

// Example: Server Action using Auth0 + Supabase
export async function exampleServerAction() {
  'use server'
  
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('your_table').select('*')
  
  if (error) {
    throw new Error(`Supabase error: ${error.message}`)
  }
  
  return data
}