import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { FAQ } from '@/types';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';

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

    const supabase = await createSupabaseServerClient();

    const { data: faqsData, error } = await supabase
      .from('faqs')
      .select(`
        id,
        gen_article_id::text,
        question,
        answer,
        created_at,
        question_short
      `)
      .eq('gen_article_id', articleId) as {
        data: FAQ[] | null;
        error: PostgrestError | null;
      };

    if (error) {
      logger.error('API /api/faqs', `Error fetching FAQs for article ${articleId}`, { error });
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
    logger.error('API /api/faqs', 'Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 