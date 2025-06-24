import { NextResponse } from "next/server";
import { getGeneratedArticles } from "@/lib/fetchArticles";

export async function GET() {
  try {
    const articles = await getGeneratedArticles();
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
} 