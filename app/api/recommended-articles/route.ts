import { NextRequest, NextResponse } from "next/server";
import { getGeneratedArticle } from "@/lib/fetchArticles";
import { performVectorSearch } from "@/lib/vectorSearch";
import { RECOMMENDATIONS_CONFIG } from "@/config/recommendations";

export async function POST(req: NextRequest) {
  try {
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { 
      articleId, 
      excludeIds = [], 
      limit = RECOMMENDATIONS_CONFIG.DEFAULT_COUNT 
    }: {
      articleId?: string;
      excludeIds?: string[];
      limit?: number;
    } = body;

    // Validate required parameters
    if (!articleId || typeof articleId !== 'string') {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    console.log(`[API /api/recommended-articles] Getting recommendations for article: ${articleId}, limit: ${limit}, excludeIds: ${excludeIds}`);

    // Get the source article for content-based similarity search
    const sourceArticle = await getGeneratedArticle(articleId);
    
    if (!sourceArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Perform vector search using the article content
    // Use a higher multiplier to ensure we have enough results after filtering
    const searchLimit = Math.max(limit * 5, 15);
    const similarArticles = await performVectorSearch(sourceArticle.content, searchLimit);

    console.log(`[API /api/recommended-articles] Vector search returned ${similarArticles.length} articles`);

    // Filter out the current article and recently visited articles
    const allExcludeIds = [articleId, ...excludeIds];
    const filteredArticles = similarArticles
      .filter(article => !allExcludeIds.includes(article.article_id))
      .slice(0, limit);

    console.log(`[API /api/recommended-articles] Returning ${filteredArticles.length} recommendations after filtering`);

    return NextResponse.json({
      articles: filteredArticles,
      count: filteredArticles.length,
      sourceArticleId: articleId
    }, { status: 200 });

  } catch (error) {
    console.error('[API /api/recommended-articles] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommended articles' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 