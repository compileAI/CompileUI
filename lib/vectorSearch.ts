import { GoogleGenAI } from "@google/genai";
import { Pinecone } from '@pinecone-database/pinecone';
import { createClientForServer } from "@/utils/supabase/server";
import { Article, Citation } from "@/types";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Initialize Google AI client
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

/**
 * Generate embedding for a given text using text-embedding-004
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: text
    });
    
    if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
      throw new Error('Invalid embedding response from API');
    }
    
    return response.embeddings[0].values;
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
 * Fetch articles from Supabase by IDs, filtered to show recent articles
 * Will expand date range if needed to meet the requested limit
 */
export async function fetchArticlesByIds(articleIds: string[], targetLimit: number = 6): Promise<Article[]> {
  if (articleIds.length === 0) return [];

  try {
    const supabase = await createClientForServer();
    
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
      
      console.log(`[Vector Search] Trying date range: ${range.label} (${startDate.toISOString()} to ${endDate.toISOString()})`);
      
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
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: false });

      if (error) {
        console.error("[Supabase ERROR in fetchArticlesByIds]", error);
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

/**
 * Complete vector search pipeline: embed query -> search Pinecone -> fetch from Supabase
 * Ensures we return exactly the requested number of articles by fetching more initially
 */
export async function performVectorSearch(
  userQuery: string, 
  limit: number = 10
): Promise<Article[]> {
  try {
    console.log(`[Vector Search] Starting search for query: "${userQuery}" with target limit: ${limit}`);
    
    // Step 1: Generate embedding for the user query
    const queryEmbedding = await generateEmbedding(userQuery);
    console.log(`[Vector Search] Generated embedding with ${queryEmbedding.length} dimensions`);
    
    // Step 2: Search Pinecone for more articles than needed to account for date filtering
    // Fetch 5x the limit to ensure we have enough after date filtering
    const searchLimit = Math.max(limit * 5, 50);
    const similarArticleIds = await searchSimilarVectors(queryEmbedding, searchLimit);
    console.log(`[Vector Search] Found ${similarArticleIds.length} similar articles from expanded search (limit: ${searchLimit})`);
    
    // Step 3: Fetch full article data from Supabase with date filtering
    const articles = await fetchArticlesByIds(similarArticleIds, limit);
    console.log(`[Vector Search] Successfully fetched ${articles.length} articles from Supabase after date filtering`);
    
    // Step 4: Return exactly the requested number of articles (or all if fewer available)
    const finalArticles = articles.slice(0, limit);
    console.log(`[Vector Search] Returning ${finalArticles.length} articles (requested: ${limit})`);
    
    return finalArticles;
    
  } catch (error) {
    console.error('Error in vector search pipeline:', error);
    return [];
  }
}