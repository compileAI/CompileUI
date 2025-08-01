import { NextResponse } from 'next/server';
import { getHighLevelSummaries } from '@/lib/fetchHighLevelSummaries';
import { HlcArticlesResponse } from '@/types';

export async function GET(): Promise<NextResponse<HlcArticlesResponse>> {
  try {
    console.log('[API /api/high-level-summaries] Fetching high-level summaries');
    
    const summaries = await getHighLevelSummaries();
    
    console.log(`[API /api/high-level-summaries] Successfully fetched ${summaries.length} summaries`);
    
    const response = NextResponse.json({
      success: true,
      summaries
    });

    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); // 5min cache, 10min stale
    
    return response;

  } catch (error) {
    console.error('[API /api/high-level-summaries] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch high-level summaries' 
      },
      { status: 500 }
    );
  }
} 