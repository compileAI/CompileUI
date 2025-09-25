import { GoogleGenAI } from "@google/genai";
import { Pinecone } from '@pinecone-database/pinecone';
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { Article, Citation, VectorSearchResponse, SparseSearchResponse } from "@/types";
import { tokenize } from "@/lib/tokenize";
import { buildBm25QueryVector, fetchBm25Params } from "@/lib/bm25";
import { reciprocalRankFusionWithFallback } from "@/lib/rrf";
import { logger } from "@/lib/logger";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Initialize Google AI client
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

/**
 * Generate embedding for a given text using gemini-embedding-001
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: {
        outputDimensionality: 768,
        taskType: 'RETRIEVAL_QUERY',
      } 
    });
    
    if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
      throw new Error('Invalid embedding response from API');
    }
    
    return response.embeddings[0].values;
  } catch (error) {
    logger.error('vectorSearch', 'Error generating embedding', { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Search Pinecone index for similar vectors
 */
export async function searchSimilarVectors(
  queryEmbedding: number[], 
  topK: number = 10
): Promise<VectorSearchResponse> {
  try {
    const index = pinecone.index(process.env.PINECONE_DENSE_INDEX_NAME!).namespace("genarticles");
    
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });

    // Extract article IDs and metadata from the matches
    const articleIds: string[] = queryResponse.matches?.map(match => match.id) || [];
    const scores: (number | undefined)[] = queryResponse.matches?.map(match => match.score) || [];

    return { articleIds, scores };
  } catch (error) {
    logger.error('vectorSearch', 'Error searching Pinecone', { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Failed to search vector database');
  }
}

/**
 * Fetch articles from Supabase by IDs, filtered to show recent articles
 * Will expand date range if needed to meet the requested limit
 */
export async function fetchArticlesByIds(articleIds: string[], targetLimit: number = 6): Promise<Article[]> {
  if (articleIds.length === 0) return [];

  try {
    const supabase = await createSupabaseServerClient();
    
    // Try different date ranges until we get enough articles
    const dateRanges = [
      { days: 2, label: "today and yesterday" },
      { days: 3, label: "last 3 days" },
      { days: 7, label: "last week" },
      { days: 14, label: "last 2 weeks" },
      { days: 30, label: "last month" }
    ];
    
    for (const range of dateRanges) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - (range.days - 1));
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      
      logger.debug('vectorSearch', `Trying date range: ${range.label} (${startDate.toISOString()} to ${endDate.toISOString()})`);
      
      // Updated query to include citations data
      const { data, error } = await supabase
        .from("gen_articles")
        .select(`
          article_id::text,
          date,
          title,
          content,
          fingerprint,
          tag,
          citations:citations_ref (
            source_articles (
              title,
              url,
              master_sources (
                name
              )
            )
          )
        `)
        .in("article_id", articleIds)
        .eq("tag", "CLUSTER")
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: false });

      if (error) {
        logger.error('vectorSearch', 'Supabase ERROR in fetchArticlesByIds', { error });
        continue;
      }

      if (!data) {
        console.log("[Supabase fetchArticlesByIds] No data returned from query.");
        continue;
      }

      console.log(`[Vector Search] Found ${data.length} articles within ${range.label}`);

      // If we have enough articles, use this range
      if (data.length >= targetLimit || range === dateRanges[dateRanges.length - 1]) {
        console.log(`[Vector Search] Using ${range.label} - found ${data.length} articles`);
        
        // Convert to Article type and maintain the order from Pinecone
        const articlesMap = new Map<string, Article>();
        
        data.forEach(item => {
          // Handle date conversion safely
          let articleDate: Date;
          try {
            if (item.date) {
              articleDate = new Date(item.date);
              // Check if the date is valid
              if (isNaN(articleDate.getTime())) {
                articleDate = new Date(); // Fallback to current date
              }
            } else {
              articleDate = new Date(); // Fallback to current date
            }
          } catch {
            console.warn('Error parsing date for article:', item.article_id, 'Date value:', item.date);
            articleDate = new Date(); // Fallback to current date
          }

          // Process citations data
          const citationsMap = new Map<string, Citation>();
          
          if (item.citations && Array.isArray(item.citations)) {
            item.citations.forEach((citationItem: unknown) => {
              // Type guard to ensure we have the expected structure
              if (
                citationItem && 
                typeof citationItem === 'object' &&
                'source_articles' in citationItem &&
                citationItem.source_articles &&
                typeof citationItem.source_articles === 'object' &&
                'master_sources' in citationItem.source_articles &&
                citationItem.source_articles.master_sources &&
                typeof citationItem.source_articles.master_sources === 'object' &&
                'name' in citationItem.source_articles.master_sources
              ) {
                const sourceArticle = citationItem.source_articles as {
                  title: string | null;
                  url: string | null;
                  master_sources: {
                    name: string;
                  };
                };
                
                // Create the citation object
                const newCitation: Citation = {
                  sourceName: sourceArticle.master_sources.name,
                  articleTitle: sourceArticle.title || 'Untitled',
                  url: sourceArticle.url
                };
                
                // Create a unique key based on source name and article title
                const citationKey = `${newCitation.sourceName}:${newCitation.articleTitle}`;
                
                // Only add if we haven't seen this citation before
                if (!citationsMap.has(citationKey)) {
                  citationsMap.set(citationKey, newCitation);
                }
              }
            });
          }

          // Convert the Map back to an array
          const citations = Array.from(citationsMap.values());

          articlesMap.set(String(item.article_id), {
            article_id: String(item.article_id),
            date: articleDate,
            title: String(item.title),
            content: String(item.content),
            fingerprint: String(item.fingerprint),
            tag: String(item.tag),
            citations: citations,
          });
        });

        // Return articles in the same order as the Pinecone results
        return articleIds
          .map(id => articlesMap.get(id))
          .filter((article): article is Article => article !== undefined);
      }
    }
    
    // If we get here, we couldn't find enough articles even with the longest range
    console.warn(`[Vector Search] Could not find ${targetLimit} articles even with expanded date ranges`);
    return [];
      
  } catch (error) {
    console.error('Error fetching articles by IDs:', error);
    throw new Error('Failed to fetch articles from database');
  }
}

// score is the cosine similarity score from Pinecone (I've confirmed that it is cosine similarity, not distance, so higher is more similar)
export function calculateDisplayScore(article: Article, score: number): number {
  const HALF_LIFE_DAYS = 14; // The number of days for the recency to decay to half of its value
  const LAMBDA = 0.2; // This represents the weighting of the recency vs. similarity
  const ageDays = (Date.now() - article.date.getTime()) / (1000 * 60 * 60 * 24); // Convert to days
  const recency = Math.exp(-Math.log(2) * ageDays / HALF_LIFE_DAYS);
  return LAMBDA * recency + (1 - LAMBDA) * score;
}

/**
 * Complete vector search pipeline: embed query -> search Pinecone -> fetch from Supabase
 * Ensures we return exactly the requested number of articles by fetching more initially
 */
export async function performVectorSearch(
  userQuery: string, 
  limit: number = 10
): Promise<Article[]> {
  try {
    console.log(`[Vector Search] Starting search for query: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}" with target limit: ${limit}`);
    
    // Step 1: Generate embedding for the user query
    const queryEmbedding = await generateEmbedding(userQuery);
    console.log(`[Vector Search] Generated embedding with ${queryEmbedding.length} dimensions`);
    
    // Step 2: Search Pinecone for more articles than needed to account for date filtering
    // Fetch 5x the limit to ensure we have enough after date filtering
    const searchLimit = Math.max(limit * 5, 50);
    const { articleIds, scores } = await searchSimilarVectors(queryEmbedding, searchLimit);
    console.log(`[Vector Search] Found ${articleIds.length} similar articles from genarticles namespace (limit: ${searchLimit})`);
    
    // Step 3: Fetch full article data from Supabase with date filtering
    const articles = await fetchArticlesByIds(articleIds, limit);
    console.log(`[Vector Search] Successfully fetched ${articles.length} articles from Supabase after date filtering`);

    // Step 4: Sort by the display score for each article. Javascript sort puts b before a if b - a is positive (descending order)
    articles.sort((a, b) => {
      const indexA = articleIds.indexOf(a.article_id);
      const indexB = articleIds.indexOf(b.article_id);
      const scoreA = scores[indexA] ?? 0; // Use 0 as fallback if score is undefined
      const scoreB = scores[indexB] ?? 0; // Use 0 as fallback if score is undefined
      const displayScoreA = calculateDisplayScore(a, scoreA);
      const displayScoreB = calculateDisplayScore(b, scoreB);
      return displayScoreB - displayScoreA;
    });

    // Step 5: Return exactly the requested number of articles (or all if fewer available)
    const finalArticles = articles.slice(0, limit);
    console.log(`[Vector Search] Returning ${finalArticles.length} articles (requested: ${limit})`);
    
    return finalArticles;
    
  } catch (error) {
    console.error('Error in vector search pipeline:', error);
    return [];
  }
}

/**
 * Search Pinecone sparse index using BM25 encoding
 */
export async function searchSparseVectors(
  queryEmbedding: { indices: number[]; values: number[] }, 
  topK: number = 50
): Promise<SparseSearchResponse> {
  try {
    const index = pinecone.index(process.env.PINECONE_SPARSE_INDEX_NAME!).namespace("genarticles");
    
    console.log(`[Sparse Search] Querying Pinecone with ${queryEmbedding.indices.length} sparse terms`);
        
    // @ts-expect-error Pinecone SDK 6.1.x types require `vector`, but sparse-only is valid on sparse indexes
    const queryResponse = await index.query({
      topK: topK,
      includeMetadata: true,
      sparseVector: queryEmbedding
    }); 
      
    // Extract article IDs and scores from the matches
    const articleIds: string[] = queryResponse.matches?.map(match => match.id) || [];
    const scores: (number | undefined)[] = queryResponse.matches?.map(match => match.score) || [];

    console.log(`[Sparse Search] Found ${articleIds.length} matches from Pinecone`);
    
    return { articleIds, scores };
  } catch (error) {
    console.error('Error searching Pinecone sparse index:', error);
    console.error('Query embedding indices:', queryEmbedding.indices);
    console.error('Query embedding values:', queryEmbedding.values);
    throw new Error('Failed to search sparse vector database');
  }
}

/**
 * Complete sparse search pipeline: tokenize query -> build BM25 vector -> search Pinecone -> fetch from Supabase
 */
export async function performSparseSearch(
  userQuery: string, 
  limit: number = 50
): Promise<Article[]> {
  try {    
    // Step 1: Tokenize the user query
    const tokens = tokenize(userQuery);
    
    if (tokens.length === 0) {
      console.log('[Sparse Search] No valid tokens found in query');
      return [];
    }
    
    // Step 2: Fetch BM25 parameters from Supabase
    const bm25Params = await fetchBm25Params(tokens);
    
    // Step 3: Build BM25 sparse query vector
    const sparseQueryVector = buildBm25QueryVector(
      tokens,
      bm25Params.termIdByTerm,
      bm25Params.dfByTerm,
      bm25Params.N
    );
    
    if (sparseQueryVector.indices.length === 0) {
      console.log('[Sparse Search] No valid terms found for BM25 query vector');
      return [];
    }
    
    // Step 4: Search Pinecone sparse index
    const { articleIds, scores } = await searchSparseVectors(sparseQueryVector, limit);
    console.log(`[Sparse Search] Found ${articleIds.length} similar articles from sparse index`);
    
    // Step 5: Fetch full article data from Supabase with date filtering
    const articles = await fetchArticlesByIds(articleIds, limit);
    console.log(`[Sparse Search] Successfully fetched ${articles.length} articles from Supabase after date filtering`);

    // Step 6: Sort by the display score for each article
    articles.sort((a, b) => {
      const indexA = articleIds.indexOf(a.article_id);
      const indexB = articleIds.indexOf(b.article_id);
      const scoreA = scores[indexA] ?? 0;
      const scoreB = scores[indexB] ?? 0;
      const displayScoreA = calculateDisplayScore(a, scoreA);
      const displayScoreB = calculateDisplayScore(b, scoreB);
      return displayScoreB - displayScoreA;
    });

    // Step 7: Return the requested number of articles (or all if fewer available)
    const finalArticles = articles.slice(0, limit);
    console.log(`[Sparse Search] Returning ${finalArticles.length} articles (requested: ${limit})`);
    
    return finalArticles;
    
  } catch (error) {
    console.error('Error in sparse search pipeline:', error);
    return [];
  }
}

/**
 * Hybrid search combining dense vector search and sparse BM25 search using RRF
 * 
 * @param userQuery The search query
 * @param limit Final number of articles to return
 * @returns Combined and ranked results
 */
export async function performHybridSearch(
  userQuery: string, 
  limit: number = 10
): Promise<Article[]> {
  try {
    console.log(`[Hybrid Search] Starting hybrid search for query: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}" with target limit: ${limit}`);
    
    const searchLimit = 50; // Get top 50 from each search method
    
    // Run both searches in parallel
    const [denseResults, sparseResults] = await Promise.allSettled([
      performVectorSearch(userQuery, searchLimit),
      performSparseSearch(userQuery, searchLimit)
    ]);
    
    // Handle results and errors
    let denseArticles: Article[] = [];
    let sparseArticles: Article[] = [];
    
    if (denseResults.status === 'fulfilled') {
      denseArticles = denseResults.value;
      console.log(`[Hybrid Search] Dense search returned ${denseArticles.length} articles`);
    } else {
      console.error('[Hybrid Search] Dense search failed:', denseResults.reason);
    }
    
    if (sparseResults.status === 'fulfilled') {
      sparseArticles = sparseResults.value;
      console.log(`[Hybrid Search] Sparse search returned ${sparseArticles.length} articles`);
    } else {
      console.error('[Hybrid Search] Sparse search failed:', sparseResults.reason);
    }
    
    // Handle fallback scenarios
    if (denseResults.status === 'rejected' && sparseResults.status === 'rejected') {
      console.error('[Hybrid Search] Both dense and sparse searches failed');
      return [];
    }
    
    if (denseResults.status === 'rejected') {
      console.log('[Hybrid Search] Falling back to sparse search only');
      return sparseArticles.slice(0, limit);
    }
    
    if (sparseResults.status === 'rejected') {
      console.log('[Hybrid Search] Falling back to dense search only');
      return denseArticles.slice(0, limit);
    }
    
    // Apply RRF fusion
    const fusedResults = reciprocalRankFusionWithFallback(denseArticles, sparseArticles, 60);
    console.log(`[Hybrid Search] RRF fusion returned ${fusedResults.length} articles`);
    
    // Return the requested number of articles
    const finalResults = fusedResults.slice(0, limit);
    console.log(`[Hybrid Search] Returning ${finalResults.length} articles (requested: ${limit})`);
    
    return finalResults;
    
  } catch (error) {
    console.error('Error in hybrid search pipeline:', error);
    return [];
  }
}