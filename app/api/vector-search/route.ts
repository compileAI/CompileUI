import { NextResponse } from "next/server";
import { performVectorSearch, performHybridSearch } from "@/lib/vectorSearch";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { query, limit = 10, use_hybrid_search = false, use_sparse_only = false } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    logger.info('API /api/vector-search', `Received query: "${query}" with limit: ${limit}, hybrid: ${use_hybrid_search}, sparse-only: ${use_sparse_only}`);

    let articles;
    let searchMethod;

    if (use_sparse_only) {
      const { performSparseSearch } = await import("@/lib/vectorSearch");
      articles = await performSparseSearch(query, limit);
      searchMethod = 'sparse';
    } else if (use_hybrid_search) {
      articles = await performHybridSearch(query, limit);
      searchMethod = 'hybrid';
    } else {
      articles = await performVectorSearch(query, limit);
      searchMethod = 'dense';
    }

    return NextResponse.json({
      articles,
      count: articles.length,
      query,
      use_hybrid_search,
      use_sparse_only,
      search_method: searchMethod
    }, { status: 200 });

  } catch (error) {
    logger.error('API /api/vector-search', 'Error performing vector search', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to perform vector search' },
      { status: 500 }
    );
  }
}