import { useState, useCallback } from "react";
import { Article, EnhancedArticle } from "@/types";

interface SearchState {
  loading: boolean;
  articles: EnhancedArticle[];
  error?: string;
}

interface CachedSearchResult {
  contentInterests: string;
  presentationStyle: string;
  articles: EnhancedArticle[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_KEY = "compile-enhanced-articles";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useHomeSearch() {
  const [state, setState] = useState<SearchState>({
    loading: false,
    articles: []
  });

  // Helper function to get cached results
  const getCachedResults = (contentInterests: string, presentationStyle: string): EnhancedArticle[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cachedData: CachedSearchResult = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > cachedData.expiresAt) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Check if both preferences match (case-insensitive)
      if (cachedData.contentInterests.toLowerCase() === contentInterests.toLowerCase() &&
          cachedData.presentationStyle.toLowerCase() === presentationStyle.toLowerCase()) {
        console.log(`[useHomeSearch] Using cached results for content interests: "${contentInterests}" and presentation style: "${presentationStyle}"`);
        const articles = cachedData.articles.map(article => ({
          ...article,
          date: new Date(article.date) // Convert date string back to Date object
        }));
        console.log(`[useHomeSearch] Cached articles citations:`, articles.map(a => ({ id: a.article_id, citationCount: a.citations?.length || 0 })));
        return articles;
      }

      return null;
    } catch (error) {
      console.warn('[useHomeSearch] Error reading cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  // Helper function to cache results
  const cacheResults = (contentInterests: string, presentationStyle: string, articles: EnhancedArticle[]) => {
    try {
      console.log(`[useHomeSearch] Caching articles with citations:`, articles.map(a => ({ id: a.article_id, citationCount: a.citations?.length || 0 })));
      const cacheData: CachedSearchResult = {
        contentInterests,
        presentationStyle,
        articles,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[useHomeSearch] Cached ${articles.length} enhanced articles for content interests: "${contentInterests}" and presentation style: "${presentationStyle}"`);
      
      // Dispatch custom event to notify other components about cache update
      window.dispatchEvent(new CustomEvent('cacheUpdated', { detail: cacheData }));
    } catch (error) {
      console.warn('[useHomeSearch] Error caching results:', error);
    }
  };

  const search = useCallback(async (contentInterests: string, presentationStyle: string) => {
    if (!contentInterests.trim() || !presentationStyle.trim()) return;

    // Check cache first
    const cachedArticles = getCachedResults(contentInterests, presentationStyle);
    if (cachedArticles) {
      setState({ loading: false, articles: cachedArticles, error: undefined });
      return;
    }

    setState({ loading: true, articles: [] });

    try {
      console.log(`[useHomeSearch] Starting fresh search for content interests: "${contentInterests}" and presentation style: "${presentationStyle}"`);

      // Step 1: Vector search to get top 6 articles using content interests
      const searchResponse = await fetch("/api/vector-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: contentInterests, limit: 6 })
      });

      if (!searchResponse.ok) {
        throw new Error(`Vector search failed: ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      const articles: Article[] = searchData.articles || [];

      console.log(`[useHomeSearch] Found ${articles.length} articles from vector search`);

      if (articles.length === 0) {
        setState({ loading: false, articles: [], error: "No articles found for your interests" });
        return;
      }

      // Step 2: Enhance articles in parallel with controlled concurrency
      console.log(`[useHomeSearch] Starting enhancement for ${articles.length} articles`);
      
      const enhancementPromises = articles.map(async (article) => {
        try {
          const enhanceResponse = await fetch("/api/enhance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentInterests, presentationStyle, article })
          });

          if (!enhanceResponse.ok) {
            console.warn(`Enhancement failed for article ${article.article_id}: ${enhanceResponse.statusText}`);
            // Return article with original content as fallback
            return { ...article, tuned: article.content };
          }

          const enhancedArticle: EnhancedArticle = await enhanceResponse.json();
          return enhancedArticle;
        } catch (error) {
          console.warn(`Enhancement error for article ${article.article_id}:`, error);
          // Return article with original content as fallback
          return { ...article, tuned: article.content };
        }
      });

      // Wait for all enhancements to complete
      const enhancedArticles = await Promise.all(enhancementPromises);

      console.log(`[useHomeSearch] Successfully enhanced ${enhancedArticles.length} articles`);

      // Cache the results before setting state
      cacheResults(contentInterests, presentationStyle, enhancedArticles);

      setState({
        loading: false,
        articles: enhancedArticles,
        error: undefined
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

  // Function to clear cache (useful for debugging or manual refresh)
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    console.log('[useHomeSearch] Cache cleared');
    
    // Dispatch custom event to notify other components about cache update
    window.dispatchEvent(new CustomEvent('cacheUpdated', { detail: null }));
  }, []);

  return {
    ...state,
    search,
    clearCache
  };
} 