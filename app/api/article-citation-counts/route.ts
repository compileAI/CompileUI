import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json(
        { error: 'Article IDs are required' },
        { status: 400 }
      );
    }

    // Parse comma-separated article IDs
    const articleIds = ids.split(',').map(id => id.trim()).filter(id => id);

    if (articleIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid article IDs provided' },
        { status: 400 }
      );
    }

    logger.info('API /api/article-citation-counts', `Fetching citation counts for ${articleIds.length} articles`);

    const supabase = await createSupabaseServerClient();

    // Use the view for efficient citation counting
    const { data, error } = await supabase
      .from('article_citation_counts')
      .select('article_id, citation_count')
      .in('article_id', articleIds);

    if (error) {
      logger.error('API /api/article-citation-counts', 'Supabase error', { error: error });
      return NextResponse.json(
        { error: 'Failed to fetch citation counts' },
        { status: 500 }
      );
    }

    // Convert to a map for easy lookup
    const citationCounts: Record<string, number> = {};
    (data || []).forEach(item => {
      citationCounts[item.article_id] = item.citation_count;
    });

    logger.info('API /api/article-citation-counts', `Returning citation counts for ${Object.keys(citationCounts).length} articles`);

    return NextResponse.json(citationCounts);
  } catch (error) {
    logger.error('API /api/article-citation-counts', 'Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
