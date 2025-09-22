import { useState, useCallback } from "react";
import { Article } from "@/types";

interface DiscoverState {
  articles: Article[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  currentPage: number;
  searchQuery?: string;
  fullDataset: Article[];
}

interface CachedDiscoverResult {
  articles: Article[];
  timestamp: number;
  expiresAt: number;
  searchQuery?: string;
}

const CACHE_KEY = "compile-discover-articles";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const ARTICLES_PER_PAGE = 20;

export function useDiscoverArticles() {
  const [state, setState] = useState<DiscoverState>({
    articles: [],
    loading: false,
    hasMore: true,
    currentPage: 0,
    fullDataset: [],
  });

  // Helper function to get cached results
  const getCachedResults = (searchQuery?: string): Article[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cachedData: CachedDiscoverResult = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > cachedData.expiresAt) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Check if search query matches. (both undefined or both same)
      if (cachedData.searchQuery === searchQuery) {
        console.log('[useDiscoverArticles] Using cached results for search:', searchQuery || 'all articles');
        const articles = cachedData.articles.map(article => ({
          ...article,
          date: new Date(article.date) // Convert date string back to Date object
        }));
        if (articles.length > 0) {
          return articles;
        } // Otherwise, continue to return null, triggering another fetch.
      }

      console.log("[useDiscoverArticles] No cached results found for search:", searchQuery || 'all articles');

      return null;
    } catch (error) {
      console.warn('[useDiscoverArticles] Error reading cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  // Helper function to cache results
  const cacheResults = (articles: Article[], searchQuery?: string) => {
    if (articles.length === 0) {
      console.log("[useDiscoverArticles] No articles to cache");
      return;
    }
    try {
      const cacheData: CachedDiscoverResult = {
        articles,
        searchQuery,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[useDiscoverArticles] Cached ${articles.length} articles for search:`, searchQuery || 'all articles');
    } catch (error) {
      console.warn('[useDiscoverArticles] Error caching results:', error);
    }
  };

  const fetchArticles = useCallback(async (searchQuery?: string, page = 0, append = false, use_hybrid_search = false) => {
    // Only check cache for general article fetching (no search query)
    // Don't cache search results to ensure fresh results
    if (!append && !searchQuery?.trim()) {
      const cachedArticles = getCachedResults(searchQuery);
      if (cachedArticles) {
        // Calculate pagination for cached results
        const startIndex = page * ARTICLES_PER_PAGE;
        const endIndex = startIndex + ARTICLES_PER_PAGE;
        const pageArticles = cachedArticles.slice(startIndex, endIndex);
        const hasMore = endIndex < cachedArticles.length;

        setState({
          articles: pageArticles,
          loading: false,
          hasMore,
          currentPage: page,
          searchQuery,
          fullDataset: cachedArticles, // Store full dataset for loadMore
        });
        return;
      }
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: undefined,
      ...(append ? {} : { articles: [], currentPage: 0, searchQuery, fullDataset: [] })
    }));

    try {
      let articles: Article[];

      if (searchQuery?.trim()) {
        // Vector search for specific query
        console.log(`[useDiscoverArticles] Performing vector search for: "${searchQuery}"`);
        
        const response = await fetch('/api/vector-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            limit: ARTICLES_PER_PAGE * (page + 1), // Get all pages up to current
            use_hybrid_search: use_hybrid_search
          }),
        });

        if (!response.ok) {
          throw new Error(`Vector search failed: ${response.statusText}`);
        }

        const data = await response.json();
        articles = data.articles || [];
      } else {
        // Fetch all generated articles
        console.log('[useDiscoverArticles] Fetching all generated articles');
        
        const response = await fetch('/api/fetchArticles');
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        articles = data || [];
      }

      console.log(`[useDiscoverArticles] Fetched ${articles.length} articles`);

      // For pagination, slice the results
      const startIndex = page * ARTICLES_PER_PAGE;
      const endIndex = startIndex + ARTICLES_PER_PAGE;
      const pageArticles = articles.slice(startIndex, endIndex);
      const hasMore = endIndex < articles.length;

      setState(prev => ({
        ...prev,
        articles: append ? [...prev.articles, ...pageArticles] : pageArticles,
        loading: false,
        hasMore,
        currentPage: page,
        error: undefined,
        fullDataset: append ? prev.fullDataset : articles, // Store full dataset
      }));

      // Only cache general article fetching (not search results)
      if (!append && !searchQuery?.trim()) {
        cacheResults(articles, searchQuery);
      }

    } catch (error) {
      console.error('[useDiscoverArticles] Fetch error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Something went wrong",
      }));
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading) {
      return;
    }

    const nextPage = state.currentPage + 1;
    
    // If we have full dataset cached, use it for pagination without fetching
    if (state.fullDataset.length > 0) {
      const startIndex = nextPage * ARTICLES_PER_PAGE;
      const endIndex = Math.min(startIndex + ARTICLES_PER_PAGE, state.fullDataset.length);
      const pageArticles = state.fullDataset.slice(startIndex, endIndex);
      const hasMore = endIndex < state.fullDataset.length;

      setState(prev => ({
        ...prev,
        articles: [...prev.articles, ...pageArticles],
        hasMore,
        currentPage: nextPage,
      }));
    } else {
      // Fallback: fetch more data (should rarely happen with proper caching)
      fetchArticles(state.searchQuery, nextPage, true);
    }
  }, [state.hasMore, state.loading, state.searchQuery, state.currentPage, state.fullDataset, fetchArticles]);

  const search = useCallback((query: string) => {
    // If query is provided, use hybrid search
    // If query is not provided, use dense search
    if (query.trim()) {
      fetchArticles(query.trim(), 0, false, true);
    } else {
      fetchArticles(undefined, 0, false, false);
    }
  }, [fetchArticles]);

  const refresh = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    fetchArticles(state.searchQuery, 0, false);
  }, [state.searchQuery, fetchArticles]);

  return {
    ...state,
    fetchArticles,
    loadMore,
    search,
    refresh,
  };
} 