import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { Article, Citation, ArticleWithCitations } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";


export async function getGeneratedArticles(): Promise<Article[]> {
  const supabase = await createSupabaseServerClient();

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
    .in("tag", ["CLUSTER"])
    .gte("date", oneWeekAgoISO)
    .order("date", { ascending: false }) as { 
      data: ArticleWithCitations[] | null;
      error: PostgrestError | null;
    };

  if (articlesError) {
    console.error("[Supabase ERROR in getGeneratedArticles]", articlesError);
    return [];
  }

  if (!articlesData) {
    return [];
  }

  // Transform the data into our Article type
  const typedArticles: Article[] = await Promise.all(
    articlesData.map(async (item) => {
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
    })
  );

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
    console.error(`[Supabase ERROR in getArticleCitations] Failed to fetch citations for article ${articleId}:`, error);
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


