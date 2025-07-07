import { useState, useCallback } from "react";
import { Article, EnhancedArticle, DatabaseEnhancedArticle } from "@/types";
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
    if (!contentInterests.trim() || !presentationStyle.trim()) return;

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

      // Call new enhanced articles API
      const response = await fetch(`/api/enhanced-articles?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 401) {
          // For unauthenticated users, try to fetch general articles with default preferences
          if (!userId) {
            console.log('[useHomeSearch] User not authenticated, fetching general articles with default preferences');
            
            // Use default preferences for general articles
            const generalParams = new URLSearchParams({
              interests: "AI, Technology, Innovation", // Default general interests
              style: "Executive Brief", // Default general style
            });
            
            const generalResponse = await fetch(`/api/enhanced-articles?${generalParams}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" }
            });
            
            if (generalResponse.ok) {
              const generalData = await generalResponse.json();
              const dbArticles: DatabaseEnhancedArticle[] = generalData.articles || [];

              console.log(`[useHomeSearch] Received ${dbArticles.length} general articles`);

              if (dbArticles.length === 0) {
                setState({ 
                  loading: false, 
                  articles: [], 
                  error: "No articles available. Please try again later.",
                  refreshesRemaining: undefined
                });
                return;
              }

              // Transform database articles to EnhancedArticle format
              const transformedArticles: EnhancedArticle[] = dbArticles.map(article => ({
                article_id: String(article.gen_article_id),
                date: new Date(article.generated_at || Date.now()),
                title: article.title,
                content: article.content, // This is the enhanced content
                fingerprint: '', // Not needed for enhanced articles
                tag: '',
                citations: article.citations || [],
                tuned: article.content // The enhanced content is in the 'content' field
              }));

              setState({
                loading: false,
                articles: transformedArticles,
                error: undefined,
                refreshesRemaining: undefined,
                source: generalData.source
              });
              return;
            }
          }
          
          // Authentication required
          setState({
            loading: false,
            articles: [],
            error: "Please log in to use personalized content preferences.",
            refreshesRemaining: undefined
          });
          return;
        }
        
        if (response.status === 429) {
          // Rate limit exceeded
          setState({
            loading: false,
            articles: [],
            error: `Daily refresh limit reached. You have ${errorData.refreshesRemaining} refreshes remaining.`,
            refreshesRemaining: errorData.refreshesRemaining
          });
          return;
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const dbArticles: DatabaseEnhancedArticle[] = data.articles || [];

      console.log(`[useHomeSearch] Received ${dbArticles.length} articles from ${data.source} source`);

      if (dbArticles.length === 0) {
        setState({ 
          loading: false, 
          articles: [], 
          error: "No articles found for your interests",
          refreshesRemaining: data.refreshesRemaining
        });
        return;
      }

      // Transform database articles to EnhancedArticle format
      const transformedArticles: EnhancedArticle[] = dbArticles.map(article => ({
        article_id: String(article.gen_article_id),
        date: new Date(article.generated_at || Date.now()),
        title: article.title,
        content: article.content, // This is the enhanced content
        fingerprint: '', // Not needed for enhanced articles
        tag: '',
        citations: article.citations || [],
        tuned: article.content // The enhanced content is in the 'content' field
      }));

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