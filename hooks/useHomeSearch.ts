import { useState, useCallback } from "react";
import { Article, EnhancedArticle, DatabaseEnhancedArticle, Citation } from "@/types";
import { createClient } from "@/utils/supabase/client";

interface SearchState {
  loading: boolean;
  articles: EnhancedArticle[];
  error?: string;
  refreshesRemaining?: number;
  source?: 'pre-computed' | 'hybrid';
}

export function useHomeSearch() {
  const [state, setState] = useState<SearchState>({
    loading: false,
    articles: []
  });

  const search = useCallback(async (contentInterests: string, presentationStyle: string, forceRefresh: boolean = false) => {
    // Allow empty strings to pass through - server will handle defaults
    setState({ loading: true, articles: [] });

    try {
      console.log(`[useHomeSearch] Starting search for content interests: "${contentInterests}" and presentation style: "${presentationStyle}"${forceRefresh ? ' (force refresh)' : ''}`);

      // Get current user ID
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      // Build query parameters
      const params = new URLSearchParams({
        interests: contentInterests,
        style: presentationStyle,
        ...(forceRefresh && { forceRefresh: 'true' })
      });

      // Only add userId if user is authenticated
      if (userId) {
        params.append('userId', userId);
      }

      // Call enhanced articles API
      const response = await fetch(`/api/enhanced-articles?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        let errorData;
        let errorText;
        
        // Clone the response to avoid "body stream already read" error
        const responseClone = response.clone();
        
        try {
          // Try to parse as JSON first
          errorData = await response.json();
          errorText = errorData.error;
        } catch (parseError) {
          // If JSON parsing fails, try to get text from the cloned response
          try {
            errorText = await responseClone.text();
          } catch (textError) {
            // If both fail, use status text
            errorText = response.statusText || `HTTP error! status: ${response.status}`;
          }
        }
        
        if (response.status === 429) {
          // Rate limit exceeded
          setState({
            loading: false,
            articles: [],
            error: `Daily refresh limit reached. You have ${errorData?.refreshesRemaining || 0} refreshes remaining.`,
            refreshesRemaining: errorData?.refreshesRemaining
          });
          return;
        }
        
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const dbArticles: DatabaseEnhancedArticle[] = data.articles || [];

      console.log(`[useHomeSearch] Received ${dbArticles.length} articles from ${data.source} source`);

      if (dbArticles.length === 0) {
        setState({ 
          loading: false, 
          articles: [], 
          error: "No articles found",
          refreshesRemaining: data.refreshesRemaining
        });
        return;
      }

      // Transform database articles to EnhancedArticle format - fetch real citations
      const transformedArticles: EnhancedArticle[] = await Promise.all(
        dbArticles.map(async (article) => {
          // Fetch actual citations from the original article instead of just the count
          const { data: originalArticleData, error } = await createClient()
            .from("gen_articles")
            .select(`
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
            .eq("article_id", String(article.gen_article_id))
            .single();

          let realCitations: Citation[] = [];
          
          if (!error && originalArticleData?.citations) {
            const citationsMap = new Map<string, Citation>();
            
            originalArticleData.citations.forEach((citation: any) => {
              if (citation?.source_articles?.master_sources?.name) {
                const newCitation: Citation = {
                  sourceName: citation.source_articles.master_sources.name,
                  articleTitle: citation.source_articles.title || 'Untitled',
                  url: citation.source_articles.url
                };
                
                const citationKey = `${newCitation.sourceName}:${newCitation.articleTitle}`;
                if (!citationsMap.has(citationKey)) {
                  citationsMap.set(citationKey, newCitation);
                }
              }
            });
            
            realCitations = Array.from(citationsMap.values());
          }

          // Get the original article date from metadata, fallback to generated_at if not available
          const originalDate = article.enhancement_metadata?.original_article_date || article.generated_at;
          
          return {
            article_id: String(article.gen_article_id),
            date: new Date(originalDate || Date.now()),
            title: article.title,
            content: article.content,
            fingerprint: '',
            tag: '',
            citations: realCitations,
            tuned: article.content
          };
        })
      );

      setState({
        loading: false,
        articles: transformedArticles,
        error: undefined,
        refreshesRemaining: data.refreshesRemaining,
        source: data.source
      });

    } catch (error) {
      console.error('[useHomeSearch] Search error:', error);
      setState({
        loading: false,
        articles: [],
        error: error instanceof Error ? error.message : "Something went wrong"
      });
    }
  }, []);

  return {
    ...state,
    search
  };
} 