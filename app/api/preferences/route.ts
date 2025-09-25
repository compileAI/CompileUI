import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth0User';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PreferencesApiResponse, PreferencesApiRequest, DatabasePreferences } from '@/types/preferences';
import { logger } from '@/lib/logger';


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest): Promise<NextResponse<PreferencesApiResponse>> {
  try {
    // Get Auth0 user
    const { data: { user }, error: userError } = await getApiUser();
    
    if (userError || !user) {
      logger.error('API /api/preferences', 'Auth error in GET', { error: userError });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Supabase client with Auth0 token
    const supabase = await createSupabaseServerClient();

    // Fetch user preferences - use Auth0 user.sub instead of user.id
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('content_preferences, style_preferences')
      .eq('user_id', user.sub)
      .single();

    if (prefsError) {
      if (prefsError.code === 'PGRST116') {
        // No preferences found - this is ok
        return NextResponse.json({
          success: true,
          preferences: undefined
        });
      }
      
      logger.error('API /api/preferences', 'Error fetching preferences', { error: prefsError });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: preferences as DatabasePreferences
    });

  } catch (error) {
    logger.error('API /api/preferences', 'Unexpected error in GET', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<PreferencesApiResponse>> {
  try {
    // Get Auth0 user
    const { data: { user }, error: userError } = await getApiUser();
    
    if (userError || !user) {
      logger.error('API /api/preferences', 'Auth error in POST', { error: userError });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Supabase client with Auth0 token
    const supabase = await createSupabaseServerClient();

    // Parse request body
    const body: PreferencesApiRequest = await request.json();
    
    // Check for missing fields (allow empty strings, but not null/undefined)
    if (body.content_preferences === null || body.content_preferences === undefined || 
        body.style_preferences === null || body.style_preferences === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert user preferences - use Auth0 user.sub instead of user.id
    const { data: preferences, error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.sub,
        content_preferences: body.content_preferences,
        style_preferences: body.style_preferences
      })
      .select('content_preferences, style_preferences')
      .single();

    if (upsertError) {
      logger.error('API /api/preferences', 'Error upserting preferences', { error: upsertError });
      return NextResponse.json(
        { success: false, error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: preferences as DatabasePreferences
    });

  } catch (error) {
    logger.error('API /api/preferences', 'Unexpected error in POST', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 