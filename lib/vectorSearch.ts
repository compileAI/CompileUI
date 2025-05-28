import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from '@pinecone-database/pinecone';
import { createClientForServer } from "@/utils/supabase/server";
import { Article } from "@/types";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

/**
 * Generate embedding for a given text using text-embedding-004
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Search Pinecone index for similar vectors
 */
export async function searchSimilarVectors(
  queryEmbedding: number[], 
  topK: number = 10
): Promise<string[]> {
  try {
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!).namespace("generated");
    
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });

    // Extract article IDs from the matches
    const articleIds = queryResponse.matches?.map(match => match.id) || [];
    return articleIds;
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    throw new Error('Failed to search vector database');
  }
}

/**
 * Fetch articles from Supabase by IDs
 */
export async function fetchArticlesByIds(articleIds: string[]): Promise<Article[]> {
  if (articleIds.length === 0) return [];

  try {
    const supabase = await createClientForServer();
    
    const { data, error } = await supabase
      .from("gen_articles")
      .select("article_id::text, date, title, content, fingerprint, tag")
      .in("article_id", articleIds)
      .order("date", { ascending: false });

    if (error) {
      console.error("[Supabase ERROR in fetchArticlesByIds]", error);
      return [];
    }

    if (!data) {
      console.log("[Supabase fetchArticlesByIds] No data returned from query.");
      return [];
    }

    // Convert to Article type and maintain the order from Pinecone
    const articlesMap = new Map<string, Article>();
    
    data.forEach(item => {
      articlesMap.set(String(item.article_id), {
        article_id: String(item.article_id),
        date: new Date(item.date),
        title: String(item.title),
        content: String(item.content),
        fingerprint: String(item.fingerprint),
        tag: String(item.tag),
        citations: [],
      });
    });

    // Return articles in the same order as the Pinecone results
    return articleIds
      .map(id => articlesMap.get(id))
      .filter((article): article is Article => article !== undefined);
      
  } catch (error) {
    console.error('Error fetching articles by IDs:', error);
    throw new Error('Failed to fetch articles from database');
  }
}

/**
 * Complete vector search pipeline: embed query -> search Pinecone -> fetch from Supabase
 */
export async function performVectorSearch(
  userQuery: string, 
  limit: number = 10
): Promise<Article[]> {
  try {
    console.log(`[Vector Search] Starting search for query: "${userQuery}"`);
    
    // Step 1: Generate embedding for the user query
    const queryEmbedding = await generateEmbedding(userQuery);
    console.log(`[Vector Search] Generated embedding with ${queryEmbedding.length} dimensions`);
    
    // Step 2: Search Pinecone for similar articles
    const similarArticleIds = await searchSimilarVectors(queryEmbedding, limit);
    console.log(`[Vector Search] Found ${similarArticleIds.length} similar articles:`, similarArticleIds);
    
    // Step 3: Fetch full article data from Supabase
    const articles = await fetchArticlesByIds(similarArticleIds);
    console.log(`[Vector Search] Successfully fetched ${articles.length} articles from Supabase`);
    
    return articles;
    
  } catch (error) {
    console.error('Error in vector search pipeline:', error);
    return [];
  }
}