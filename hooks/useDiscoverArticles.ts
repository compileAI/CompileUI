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

      // Check if search query matches (both undefined or both same)
      if (cachedData.searchQuery === searchQuery) {
        // Ignore empty cache results
        if (!cachedData.articles || cachedData.articles.length === 0) {
          console.log('[useDiscoverArticles] Ignoring empty cached results');
          localStorage.removeItem(CACHE_KEY);
          return null;
        }
        
        console.log('[useDiscoverArticles] Using cached results for search:', searchQuery || 'all articles');
        const articles = cachedData.articles.map(article => ({
          ...article,
          date: new Date(article.date) // Convert date string back to Date object
        }));
        return articles;
      }

      return null;
    } catch (error) {
      console.warn('[useDiscoverArticles] Error reading cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  // Helper function to cache results
  const cacheResults = (articles: Article[], searchQuery?: string) => {
    // Don't cache empty results
    if (!articles || articles.length === 0) {
      console.log('[useDiscoverArticles] Skipping cache for empty results');
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

  const fetchArticles = useCallback(async (searchQuery?: string, page = 0, append = false, isRetry = false) => {
    // Only check cache for general article fetching (no search query)
    // Don't cache search results to ensure fresh results
    if (!append && !searchQuery?.trim() && !isRetry) {
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
            limit: ARTICLES_PER_PAGE * (page + 1) // Get all pages up to current
          }),
        });

        if (!response.ok) {
          throw new Error(`Vector search failed: ${response.statusText}`);
        }

        const data = await response.json();
        articles = data.articles || [];
      } else {
        // Fetch all generated articles
        console.log(`[useDiscoverArticles] Fetching generated articles for page ${page}`);
        
        const response = await fetch(`/api/fetchArticles?page=${page}`);
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        articles = data || [];
      }

      console.log(`[useDiscoverArticles] Fetched ${articles.length} articles`);

      // Smart retry logic: if DB returns empty results and this is not a retry, wait 1 second and try again
      if (articles.length === 0 && !isRetry && !searchQuery?.trim()) {
        console.log('[useDiscoverArticles] Empty results received, retrying in 1 second...');
        setTimeout(() => {
          fetchArticles(searchQuery, page, append, true);
        }, 1000);
        return;
      }

      // If still empty after retry, show "no articles available" message
      if (articles.length === 0) {
        console.log('[useDiscoverArticles] No articles available after retry');
        setState(prev => ({
          ...prev,
          articles: [],
          loading: false,
          hasMore: false,
          currentPage: page,
          error: undefined,
          fullDataset: [],
        }));
        return;
      }

      // For pagination, if we're appending (load more), add to existing articles
      // If we got exactly the limit (20), there might be more articles available
      // If we got less than the limit, we've reached the end
      const hasMore = articles.length === ARTICLES_PER_PAGE;

      setState(prev => ({
        ...prev,
        articles: append ? [...prev.articles, ...articles] : articles,
        loading: false,
        hasMore,
        currentPage: page,
        error: undefined,
        fullDataset: append ? [...prev.fullDataset, ...articles] : articles, // Store full dataset
      }));

      // Only cache general article fetching (not search results) and only if we have articles
      if (!append && !searchQuery?.trim() && articles.length > 0) {
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
    
    // Always fetch the next page from the database since we're using limits
    fetchArticles(state.searchQuery, nextPage, true);
  }, [state.hasMore, state.loading, state.searchQuery, state.currentPage, fetchArticles]);

  const search = useCallback((query: string) => {
    fetchArticles(query.trim() || undefined, 0, false);
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