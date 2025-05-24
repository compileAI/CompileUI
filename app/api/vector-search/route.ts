import { NextResponse } from "next/server";
import { performVectorSearch } from "@/lib/vectorSearch";

export async function POST(req: Request) {
  try {
    const { query, limit = 10 } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    console.log(`[API /api/vector-search] Received query: "${query}" with limit: ${limit}`);

    const articles = await performVectorSearch(query, limit);

    return NextResponse.json({
      articles,
      count: articles.length,
      query
    }, { status: 200 });

  } catch (error) {
    console.error('[API /api/vector-search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to perform vector search' },
      { status: 500 }
    );
  }
}