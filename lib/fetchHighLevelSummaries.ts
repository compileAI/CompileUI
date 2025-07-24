import { createClientForServer } from "@/utils/supabase/server";
import { HlcArticle, Article, Citation, ArticleWithCitations } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";

export async function getHighLevelSummaries(): Promise<HlcArticle[]> {
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
    const latestByTopic = new Map<string, any>();
    summariesData.forEach((summary: any) => {
      // Convert gen_article_ids from int8 numbers to strings to avoid JavaScript precision loss
      const convertedSummary = {
        ...summary,
        gen_article_ids: Array.isArray(summary.gen_article_ids) 
          ? summary.gen_article_ids.map((id: any) => String(id))
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

    // For each summary, fetch and rehydrate the gen_articles
    const summariesWithArticles = await Promise.all(
      latestSummaries.map(async (summary) => {
        console.log(`[getHighLevelSummaries] Processing summary "${summary.title}" with ${summary.gen_article_ids?.length || 0} article IDs:`, summary.gen_article_ids);
        
        const articles = await getGenArticlesByIds(summary.gen_article_ids);
        
        console.log(`[getHighLevelSummaries] Got ${articles.length} articles for summary "${summary.title}"`);
        
        return {
          id: summary.id,
          created_at: summary.created_at,
          topic: summary.topic,
          title: summary.title,
          content: summary.content,
          gen_article_ids: summary.gen_article_ids,
          articles
        } as HlcArticle;
      })
    );

    console.log(`[getHighLevelSummaries] Successfully processed ${summariesWithArticles.length} summaries with articles`);
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
    
    // Fetch articles with citations using the same pattern as fetchArticles.ts
    const { data: articlesData, error: articlesError } = await supabase
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
      .order("date", { ascending: false }) as { 
        data: ArticleWithCitations[] | null;
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

    // Transform and rehydrate citations using the same logic as fetchArticles.ts
    const typedArticles: Article[] = articlesData.map((item) => {
      // Extract and deduplicate citations from the nested data
      const citationsMap = new Map<string, Citation>();
      
      (item.citations || []).forEach(citation => {
        if (!citation?.source_articles?.master_sources?.name) return;
        
        // Create the citation object
        const newCitation: Citation = {
          sourceName: citation.source_articles.master_sources.name,
          articleTitle: citation.source_articles.title || 'Untitled',
          url: citation.source_articles.url
        };
        
        // Create a unique key based on source name and article title
        const citationKey = `${newCitation.sourceName}:${newCitation.articleTitle}`;
        
        // Only add if we haven't seen this citation before
        if (!citationsMap.has(citationKey)) {
          citationsMap.set(citationKey, newCitation);
        }
      });

      // Convert the Map back to an array
      const citations = Array.from(citationsMap.values());

      return {
        article_id: item.article_id,
        date: new Date(item.date),
        title: String(item.title),
        content: String(item.content),
        fingerprint: String(item.fingerprint),
        tag: String(item.tag),
        citations
      };
    });

    console.log(`[getGenArticlesByIds] Successfully rehydrated ${typedArticles.length} articles`);
    return typedArticles;

  } catch (error) {
    console.error("[getGenArticlesByIds] Unexpected error:", error);
    return [];
  }
} 