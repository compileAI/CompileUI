import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth0User';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { logger } from '@/lib/logger';

interface RefreshApiResponse {
  success?: boolean;
  message?: string;
  refreshesRemaining?: number;
  error?: string;
  canRefresh?: boolean;
  limit?: number;
}

// Convert current time to EST
function getCurrentESTDate(): string {
  const now = new Date();
  const estOffset = -5; // EST is UTC-5
  const estTime = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  return estTime.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

// Helper function to check user refresh limit
async function checkUserRefreshLimit(userId: string): Promise<{ canRefresh: boolean; refreshesRemaining: number; refreshCount: number }> {
  const supabase = await createSupabaseServerClient();
  const today = getCurrentESTDate();
  
  logger.debug('API /api/refresh', `Checking refresh limit for user ${userId} on date: ${today}`);
  
  // Count today's refresh records for this user
  const { count: refreshCount, error: countError } = await supabase
    .from('user_refreshes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('refresh_date', today);

  if (countError) {
    logger.error('API /api/refresh', 'Error checking refresh limit', { error: countError });
    return { canRefresh: false, refreshesRemaining: 0, refreshCount: 0 };
  }

  const actualRefreshCount = refreshCount || 0;
  const canRefresh = actualRefreshCount < 3;
  const refreshesRemaining = Math.max(0, 3 - actualRefreshCount);

  logger.debug('API /api/refresh', `Found ${actualRefreshCount} refreshes, canRefresh: ${canRefresh}, remaining: ${refreshesRemaining}`);

  return { canRefresh, refreshesRemaining, refreshCount: actualRefreshCount };
}

// Helper function to record a refresh
async function recordUserRefresh(userId: string) {
  const supabase = await createSupabaseServerClient();
  const today = getCurrentESTDate();
  
  logger.debug('API /api/refresh', `Recording refresh for user ${userId} on date: ${today}`);
  
  // Insert new refresh record
  const { error: insertError } = await supabase
    .from('user_refreshes')
    .insert({
      user_id: userId,
      refresh_date: today
    });

  if (insertError) {
    logger.error('API /api/refresh', 'Error recording user refresh', { error: insertError });
    throw insertError;
  }
  
  logger.debug('API /api/refresh', `Successfully recorded refresh for user ${userId}`);
}

export async function POST(): Promise<NextResponse<RefreshApiResponse>> {
  try {
    // Get Auth0 user instead of Supabase user
    const { data: { user }, error: userError } = await getApiUser();
    
    if (userError || !user) {
      logger.error('API /api/refresh', 'Auth error in POST', { error: userError });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check refresh limit - use Auth0 user.sub instead of user.id
    const { canRefresh, refreshesRemaining } = await checkUserRefreshLimit(user.sub);
    
    if (!canRefresh) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Daily refresh limit reached', 
          refreshesRemaining: 0,
          limit: 3
        },
        { status: 429 }
      );
    }

    // Record the refresh
    await recordUserRefresh(user.sub);

    return NextResponse.json({
      success: true,
      refreshesRemaining: refreshesRemaining - 1,
      message: 'Refresh recorded successfully'
    });

  } catch (error) {
    logger.error('API /api/refresh', 'Error in POST', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to process refresh request' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<RefreshApiResponse>> {
  try {
    // Get Auth0 user
    const { data: { user }, error: userError } = await getApiUser();
    
    if (userError || !user) {
      logger.error('API /api/refresh', 'Auth error in GET', { error: userError });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Supabase client with Auth0 token
    const supabase = await createSupabaseServerClient();

    // Debug: Get all refresh records for this user
    const { data: allRefreshes, error: debugError } = await supabase
      .from('user_refreshes')
      .select('*')
      .eq('user_id', user.sub)
      .order('refresh_date', { ascending: false });

    if (!debugError) {
      logger.debug('API /api/refresh', `All refresh records for user ${user.sub}`, { allRefreshes });
    }

    // Check refresh limit
    const { canRefresh, refreshesRemaining } = await checkUserRefreshLimit(user.sub);

    return NextResponse.json({
      success: true,
      canRefresh,
      refreshesRemaining,
      limit: 3,
      debug: { allRefreshes }
    });

  } catch (error) {
    logger.error('API /api/refresh', 'Error in POST', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to get refresh status' },
      { status: 500 }
    );
  }
} 