import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';
import { FAQ } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'articleId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClientForServer();

    const { data: faqsData, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('gen_article_id', articleId);

    if (error) {
      console.error(`[API /api/faqs] Error fetching FAQs for article ${articleId}:`, error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch FAQs' },
        { status: 500 }
      );
    }

    const faqs: FAQ[] = faqsData || [];

    return NextResponse.json({
      success: true,
      faqs
    });

  } catch (error) {
    console.error('[API /api/faqs] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 