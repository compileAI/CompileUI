import { createClientForServer } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { PostgrestError } from "@supabase/supabase-js";

interface MasterSource {
  id: number;
  name: string;
}

interface SourceArticle {
  id: string;
  title: string | null;
  url: string | null;
  source_id: number;
  master_source: MasterSource;
}

interface CitationRef {
  source_articles: SourceArticle;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    const supabase = await createClientForServer();

    const { data: citationsData, error: citationsError } = await supabase
      .from('citations_ref')
      .select(`
        source_articles (
          id,
          title,
          url,
          source_id,
          master_source:master_sources!source_id (
            id,
            name
          )
        )
      `)
      .eq('gen_article_id', articleId) as { data: CitationRef[] | null; error: PostgrestError | null };

    if (citationsError) {
      console.error(`Failed to fetch citations: ${citationsError.message}`);
      return NextResponse.json({ error: 'Failed to fetch citations' }, { status: 500 });
    }

    if (!citationsData?.length) {
      return NextResponse.json({ citations: [] });
    }

    const citations = citationsData
      .map(citation => {
        const sourceArticle = citation.source_articles;
        if (!sourceArticle?.master_source) return null;

        return {
          sourceName: sourceArticle.master_source.name,
          articleTitle: sourceArticle.title || 'Untitled',
          url: sourceArticle.url || '#'
        };
      })
      .filter((citation): citation is { sourceName: string; articleTitle: string; url: string } => 
        citation !== null
      );

    // Remove duplicates based on source name and article title combination
    const uniqueCitations = Array.from(
      new Map(
        citations.map(citation => 
          [`${citation.sourceName}-${citation.articleTitle}`, citation]
        )
      ).values()
    );

    return NextResponse.json({ citations: uniqueCitations });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 