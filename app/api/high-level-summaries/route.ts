import { NextResponse } from 'next/server';
import { getHighLevelSummaries } from '@/lib/fetchHighLevelSummaries';
import { HlcArticlesResponse } from '@/types';

export async function GET(): Promise<NextResponse<HlcArticlesResponse>> {
  try {
    console.log('[API /api/high-level-summaries] Fetching high-level summaries');
    
    const summaries = await getHighLevelSummaries();
    
    console.log(`[API /api/high-level-summaries] Successfully fetched ${summaries.length} summaries`);
    
    return NextResponse.json({
      success: true,
      summaries
    });

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