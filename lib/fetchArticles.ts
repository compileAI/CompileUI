import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { Article, Citation, ArticleWithCitations } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Helper function to fetch citation counts for article IDs
export async function getCitationCounts(articleIds: string[]): Promise<Record<string, number>> {
  if (articleIds.length === 0) return {};

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('article_citation_counts')
    .select('article_id, citation_count')
    .in('article_id', articleIds);

  if (error) {
    logger.error('fetchArticles', 'Error fetching citation counts', { error });
    return {};
  }

  const citationCounts: Record<string, number> = {};
  (data || []).forEach(item => {
    citationCounts[item.article_id] = item.citation_count;
  });

  return citationCounts;
}

// Lazy loading function to fetch citations for a specific article
export async function getArticleCitationsLazy(articleId: string): Promise<Citation[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("citations_ref")
    .select(`
      source_articles (
        title,
        url,
        master_sources (
          name
        )
      )
    `)
    .eq("gen_article_id", articleId) as {
      data: Array<{ source_articles: { title: string | null; url: string | null; master_sources: { name: string } } }> | null;
      error: PostgrestError | null;
    };

  if (error) {
    logger.error('fetchArticles', `Failed to fetch citations for article ${articleId}`, { error });
    return [];
  }

  if (!data) {
    return [];
  }

  // Transform citations with deduplication
  const citationsMap = new Map<string, Citation>();

  data.forEach(item => {
    const sourceArticle = item.source_articles;
    if (!sourceArticle?.master_sources?.name) return;

    const newCitation: Citation = {
      sourceName: sourceArticle.master_sources.name,
      articleTitle: sourceArticle.title || 'Untitled',
      url: sourceArticle.url
    };

    const citationKey = `${newCitation.sourceName}:${newCitation.articleTitle}`;
    if (!citationsMap.has(citationKey)) {
      citationsMap.set(citationKey, newCitation);
    }
  });

  return Array.from(citationsMap.values());
}


export async function getGeneratedArticles(): Promise<Article[]> {
  const supabase = await createSupabaseServerClient();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoISO = oneWeekAgo.toISOString();

  // Fetch articles without citations for faster loading
  const { data: articlesData, error: articlesError } = await supabase
    .from("gen_articles")
    .select(`
      article_id::text,
      date,
      title,
      content,
      fingerprint,
      tag
    `)
    .eq("tag", "CLUSTER")
    .gte("date", oneWeekAgoISO)
    .order("date", { ascending: false })
    .limit(20) as {
      data: Article[] | null;
      error: PostgrestError | null;
    };

  if (articlesError) {
    logger.error('fetchArticles', 'Supabase ERROR in getGeneratedArticles', { error: articlesError });
    return [];
  }
  logger.debug('fetchArticles', 'Supabase getGeneratedArticles Articles data', { articlesData });
  if (!articlesData) {
    logger.warn('fetchArticles', 'No articles found in supabase query');
    return [];
  }

  // Get article IDs for citation count lookup
  const articleIds = articlesData.map(item => item.article_id);

  // Fetch citation counts in parallel
  const citationCountsPromise = getCitationCounts(articleIds);

  // Transform the data into our Article type (no citations for faster loading)
  const typedArticles: Article[] = articlesData.map((item) => {
    return {
      article_id: item.article_id, // Already a string from article_id::text
      date: new Date(item.date),
      title: String(item.title),
      content: String(item.content),
      fingerprint: String(item.fingerprint),
      tag: String(item.tag),
      citations: [] // Citations will be loaded lazily when needed
    };
  });

  // Add citation counts to articles
  const citationCounts = await citationCountsPromise;
  typedArticles.forEach(article => {
    article.citationCount = citationCounts[article.article_id] || 0;
  });

  return typedArticles;
}

export async function getGeneratedArticle(articleId: string): Promise<Article | null> {
  const supabase = await createSupabaseServerClient();

  // Ensure we're using the exact ID string from the URL
  const { data: articleData, error: articleError } = await supabase
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

  if (articleError) {
    logger.error('fetchArticles', `Failed to fetch article ${articleId}`, { error: articleError });
    return null;
  }

  if (!articleData) {
    logger.warn('fetchArticles', `No article found with ID ${articleId}`);
    return null;
  }

  // Extract and deduplicate citations from the nested data
  const citationsMap = new Map<string, Citation>();
  
  (articleData.citations || []).forEach(citation => {
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

  // Cast the data to our Article type with proper type conversions
  const article: Article = {
    article_id: articleData.article_id, // Already a string from article_id::text
    date: new Date(articleData.date),
    title: String(articleData.title),
    content: String(articleData.content),
    fingerprint: String(articleData.fingerprint),
    tag: String(articleData.tag),
    citations
  };

  return article;
}

export async function getArticleCitations(articleId: string): Promise<Array<{ title: string | null; url: string | null }>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("citations_ref")
    .select(`
      source_articles (
        title,
        url
      )
    `)
    .eq("gen_article_id", articleId) as {
      data: Array<{ source_articles: { title: string | null; url: string | null } }> | null;
      error: PostgrestError | null;
    };

  if (error) {
    logger.error('fetchArticles', `Failed to fetch citations for article ${articleId}`, { error: error instanceof Error ? error.message : String(error) });
    return [];
  }

  if (!data) {
    return [];
  }

  // Extract source articles and filter out null entries
  const citations = data
    .map(item => item.source_articles)
    .filter(sa => sa !== null);

  return citations;
}


