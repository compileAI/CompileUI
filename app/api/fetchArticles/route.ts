import { NextResponse } from "next/server";
import { getGeneratedArticles, getGeneratedArticle } from "@/lib/fetchArticles";
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
      // Fetch all articles (existing behavior)
      const articles = await getGeneratedArticles();
      return NextResponse.json(articles);
    }
  } catch (error) {
    logger.error('API /api/fetchArticles', 'Error fetching articles', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
} 