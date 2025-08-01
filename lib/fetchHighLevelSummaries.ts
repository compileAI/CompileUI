import { createClientForServer } from "@/utils/supabase/server";
import { HlcArticle, Article, Citation, ArticleWithCitations } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";

// In-memory cache for high-level summaries
interface SummariesCache {
  data: HlcArticle[];
  timestamp: number;
  expiresAt: number;
}

let summariesCache: SummariesCache | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function getHighLevelSummaries(): Promise<HlcArticle[]> {
  // Check cache first
  if (summariesCache && Date.now() < summariesCache.expiresAt) {
    console.log('[getHighLevelSummaries] Returning cached summaries');
    return summariesCache.data;
  }

  console.log('[getHighLevelSummaries] Cache miss or expired, fetching from database');
  const supabase = await createClientForServer();

  try {
    // Get the most recent entry for each topic using a window function approach
    // Since Supabase doesn't support DISTINCT ON directly, we'll use this approach
    const { data: summariesData, error: summariesError } = await supabase
    .from("high_level_cluster_articles")
    .select(`
        id::text,
        created_at,
        topic,
        title,
        content,
        gen_article_ids::_text 
        `) // NOTE: gen_article_ids is an array of int8 in supabase, so we cast to string on read. _text is the way to do that for arrays.
    .order("topic")
    .order("created_at", { ascending: false }) as { 
        data: HlcArticle[] | null;
        error: PostgrestError | null;
    };

    if (summariesError) {
      console.error("[Supabase ERROR in getHighLevelSummaries]", summariesError);
      return [];
    }

    if (!summariesData) {
      return [];
    }

    // Get the most recent entry per topic
    const latestByTopic = new Map<string, HlcArticle>();
    summariesData.forEach((summary: HlcArticle) => {
      // Convert gen_article_ids from int8 numbers to strings to avoid JavaScript precision loss
      const convertedSummary: HlcArticle = {
        ...summary,
        gen_article_ids: Array.isArray(summary.gen_article_ids) 
          ? summary.gen_article_ids.map((id: string | number) => String(id))
          : summary.gen_article_ids
      };
      
      console.log(`[getHighLevelSummaries] Raw summary data for topic "${summary.topic}":`, {
        id: summary.id,
        title: summary.title,
        gen_article_ids_original: summary.gen_article_ids,
        gen_article_ids_converted: convertedSummary.gen_article_ids,
        gen_article_ids_type: typeof summary.gen_article_ids,
        gen_article_ids_length: summary.gen_article_ids?.length
      });
      
      if (!latestByTopic.has(summary.topic) || 
          new Date(summary.created_at) > new Date(latestByTopic.get(summary.topic)!.created_at)) {
        latestByTopic.set(summary.topic, convertedSummary);
      }
    });

    const latestSummaries = Array.from(latestByTopic.values());
    console.log(`[getHighLevelSummaries] Found ${latestSummaries.length} topics with summaries`);

    // Collect all unique article IDs from all summaries for batch fetching
    const allArticleIds = Array.from(new Set(
      latestSummaries.flatMap(summary => summary.gen_article_ids || [])
    ));
    
    console.log(`[getHighLevelSummaries] Batch fetching ${allArticleIds.length} unique articles across all summaries`);
    
    // Fetch all articles in one optimized query
    const allArticles = await getGenArticlesByIds(allArticleIds);
    
    // Create a lookup map for O(1) article retrieval
    const articleMap = new Map(allArticles.map(article => [article.article_id, article]));
    
    console.log(`[getHighLevelSummaries] Created article lookup map with ${articleMap.size} articles`);

    // Distribute articles back to their respective summaries
    const summariesWithArticles = latestSummaries.map((summary) => {
      const summaryArticles = (summary.gen_article_ids || [])
        .map(id => articleMap.get(id))
        .filter(Boolean) as Article[];
        
      console.log(`[getHighLevelSummaries] Summary "${summary.title}" matched ${summaryArticles.length}/${summary.gen_article_ids?.length || 0} articles`);
      
      return {
        id: summary.id,
        created_at: summary.created_at,
        topic: summary.topic,
        title: summary.title,
        content: summary.content,
        gen_article_ids: summary.gen_article_ids,
        articles: summaryArticles
      } as HlcArticle;
    });

    console.log(`[getHighLevelSummaries] Successfully processed ${summariesWithArticles.length} summaries with articles`);
    
    // Update cache
    summariesCache = {
      data: summariesWithArticles,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    };
    console.log('[getHighLevelSummaries] Updated cache with new data');
    
    return summariesWithArticles;

  } catch (error) {
    console.error("[getHighLevelSummaries] Unexpected error:", error);
    return [];
  }
}

async function getGenArticlesByIds(articleIds: string[]): Promise<Article[]> {
  console.log(`[getGenArticlesByIds] Called with ${articleIds?.length || 0} article IDs:`, articleIds);
  
  if (!articleIds || articleIds.length === 0) {
    console.log("[getGenArticlesByIds] No article IDs provided, returning empty array");
    return [];
  }

  const supabase = await createClientForServer();

  try {
    console.log("[getGenArticlesByIds] Executing Supabase query for article IDs:", articleIds);
    
    // Optimized query: Fetch only essential fields, no citations for better performance
    // Citations can be loaded separately if needed
    const { data: articlesData, error: articlesError } = await supabase
      .from("gen_articles")
      .select(`
        article_id::text,
        date,
        title,
        fingerprint,
        tag
      `)
      .in("article_id", articleIds)
      .order("date", { ascending: false }) as { 
        data: Array<{
          article_id: string;
          date: string;
          title: string;
          fingerprint: string;
          tag: string;
        }> | null;
        error: PostgrestError | null;
      };

    console.log(`[getGenArticlesByIds] Supabase query result - error:`, articlesError, "data count:", articlesData?.length || 0);

    if (articlesError) {
      console.error("[getGenArticlesByIds] Supabase error:", articlesError);
      return [];
    }

    if (!articlesData) {
      console.log("[getGenArticlesByIds] No data returned from Supabase");
      return [];
    }

    // Optimized transformation: No citations processing, minimal data transfer
    const typedArticles: Article[] = articlesData.map((item) => {
      return {
        article_id: item.article_id,
        date: new Date(item.date),
        title: String(item.title),
        content: '', // Empty content for faster loading - load on demand
        fingerprint: String(item.fingerprint),
        tag: String(item.tag),
        citations: [] // Empty citations for faster loading - load on demand
      };
    });

    console.log(`[getGenArticlesByIds] Successfully rehydrated ${typedArticles.length} articles`);
    return typedArticles;

  } catch (error) {
    console.error("[getGenArticlesByIds] Unexpected error:", error);
    return [];
  }
}

// Lazy loading function for full article content with citations
export async function getFullArticleById(articleId: string): Promise<Article | null> {
  const supabase = await createClientForServer();
  
  try {
    console.log(`[getFullArticleById] Loading full content for article ${articleId}`);
    
    const { data: articleData, error } = await supabase
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
      .eq("article_id", articleId)
      .single() as {
        data: ArticleWithCitations | null;
        error: PostgrestError | null;
      };

    if (error || !articleData) {
      console.error(`[getFullArticleById] Error loading article ${articleId}:`, error);
      return null;
    }

    // Process citations
    const citationsMap = new Map<string, Citation>();
    (articleData.citations || []).forEach(citation => {
      if (!citation?.source_articles?.master_sources?.name) return;
      
      const newCitation: Citation = {
        sourceName: citation.source_articles.master_sources.name,
        articleTitle: citation.source_articles.title || 'Untitled',
        url: citation.source_articles.url
      };
      
      const citationKey = `${newCitation.sourceName}:${newCitation.articleTitle}`;
      if (!citationsMap.has(citationKey)) {
        citationsMap.set(citationKey, newCitation);
      }
    });

    return {
      article_id: articleData.article_id,
      date: new Date(articleData.date),
      title: String(articleData.title),
      content: String(articleData.content),
      fingerprint: String(articleData.fingerprint),
      tag: String(articleData.tag),
      citations: Array.from(citationsMap.values())
    };

  } catch (error) {
    console.error(`[getFullArticleById] Unexpected error loading article ${articleId}:`, error);
    return null;
  }
}

// Cache invalidation function - call this when summaries are updated
export function invalidateSummariesCache(): void {
  console.log('[invalidateSummariesCache] Clearing summaries cache');
  summariesCache = null;
} 