import { createClient } from "@/utils/supabase/client";
import { Article, Citation } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";

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

export async function getGeneratedArticleClient(articleId: string): Promise<Article | null> {
  const supabase = createClient();

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
    console.error(`[Supabase ERROR in getGeneratedArticleClient] Failed to fetch article ${articleId}:`, articleError);
    return null;
  }

  if (!articleData) {
    console.log(`[Supabase getGeneratedArticleClient] No article found with ID ${articleId}`);
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