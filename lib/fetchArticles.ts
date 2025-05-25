import { createClientForServer } from "@/utils/supabase/server";
import { Article, SourceArticleContext, Citation } from "@/types"; // Import SourceArticleContext

interface MasterSource {
  name: string;
}

interface SourceArticle {
  title: string | null;
  url: string | null;
  master_sources: MasterSource;
}

interface CitationRef {
  gen_article_id: string;
  source_articles: SourceArticle;
}

interface SourceArticleWithMasterSource {
  id: string;
  title: string | null;
  url: string | null;
  master_sources: {
    id: number;
    name: string;
  };
}

interface CitationResponse {
  gen_article_id: string;
  source_articles: SourceArticleWithMasterSource;
}

interface ArticleWithCitations {
  article_id: string;
  date: string;
  title: string;
  content: string;
  fingerprint: string;
  tag: string;
  citations: Array<{
    source_articles: {
      title: string | null;
      url: string | null;
      master_sources: {
        name: string;
      };
    };
  }>;
}

export async function getGeneratedArticles(): Promise<Article[]> {
  const supabase = await createClientForServer();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoISO = oneWeekAgo.toISOString();

  // Fetch articles and their citations in a single query
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
    .gte("date", oneWeekAgoISO)
    .order("date", { ascending: false }) as { 
      data: ArticleWithCitations[] | null;
      error: any;
    };

  if (articlesError) {
    console.error("[Supabase ERROR in getGeneratedArticles]", articlesError);
    return [];
  }

  if (!articlesData) {
    return [];
  }

  // Transform the data into our Article type
  const typedArticles: Article[] = articlesData.map(item => {
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
      article_id: item.article_id, // Already a string from article_id::text
      date: new Date(item.date),
      title: String(item.title),
      content: String(item.content),
      fingerprint: String(item.fingerprint),
      tag: String(item.tag),
      citations
    };
  });

  return typedArticles;
}

export async function getGeneratedArticle(articleId: string): Promise<Article | null> {
  const supabase = await createClientForServer();

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
      error: any;
    };

  if (articleError) {
    console.error(`[Supabase ERROR in getGeneratedArticle] Failed to fetch article ${articleId}:`, articleError);
    return null;
  }

  if (!articleData) {
    console.log(`[Supabase getGeneratedArticle] No article found with ID ${articleId}`);
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
    article_id: articleData.article_id,  // Already a string from article_id::text
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
  const supabase = await createClientForServer();

  // Convert string ID to bigint format
  const numericId = BigInt(articleId);

  const { data, error } = await supabase
    .from('citations_ref')
    .select(`
      source_articles (
        title,
        url
      )
    `)
    .eq('gen_article_id', numericId) as { data: CitationRef[] | null; error: any };

  if (error) {
    console.error(`[Supabase ERROR in getArticleCitations] Failed to fetch citations for article ${articleId}:`, error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log(`[Supabase getArticleCitations] No citations found for article ${articleId}`);
    return [];
  }

  // Extract and deduplicate citations
  const citationsMap = new Map<string, { title: string | null; url: string | null }>();
  data.forEach(item => {
    if (item.source_articles && item.source_articles.title) {
      citationsMap.set(item.source_articles.title, {
        title: item.source_articles.title,
        url: item.source_articles.url
      });
    }
  });

  return Array.from(citationsMap.values());
}
