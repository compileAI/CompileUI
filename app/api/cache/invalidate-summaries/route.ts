import { NextResponse } from 'next/server';
import { invalidateSummariesCache } from '@/lib/fetchHighLevelSummaries';

export async function POST(): Promise<NextResponse> {
  try {
    invalidateSummariesCache();
    
    return NextResponse.json({
      success: true,
      message: 'Summaries cache invalidated'
    });

  } catch (error) {
    console.error('[API /api/cache/invalidate-summaries] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to invalidate cache' 
      },
      { status: 500 }
    );
  }
}