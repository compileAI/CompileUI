import { NextResponse } from "next/server";
import { getGeneratedArticles, getGeneratedArticle, getGeneratedArticlesPaginated } from "@/lib/fetchArticles";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (articleId) {
      // Fetch specific article
      const article = await getGeneratedArticle(articleId);
      
      if (!article) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(article);
    } else {
      // New: paginated fetch with weeksBack and approximate count
      const limitParam = searchParams.get('limit');
      const offsetParam = searchParams.get('offset');
      const weeksBackParam = searchParams.get('weeksBack');

      // Default behavior matches existing: 20, 0, 1
      const limit = Math.max(1, Math.min(Number(limitParam ?? 20), 100));
      const offset = Math.max(0, Number(offsetParam ?? 0));
      const weeksBack = Math.max(1, Number(weeksBackParam ?? 1));

      const result = await getGeneratedArticlesPaginated(limit, offset, weeksBack);
      return NextResponse.json(result);
    }
  } catch (error) {
    logger.error('API /api/fetchArticles', 'Error fetching articles', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
} 