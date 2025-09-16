import { NextResponse } from "next/server";
import { getGeneratedArticles, getGeneratedArticle } from "@/lib/fetchArticles";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    const page = parseInt(searchParams.get('page') || '0', 10);

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
      // Fetch articles with pagination
      const articles = await getGeneratedArticles(page);
      return NextResponse.json(articles);
    }
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
} 