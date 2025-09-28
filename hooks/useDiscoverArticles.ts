import { useState, useCallback } from "react";
import { Article, PaginatedArticlesResponse } from "@/types";
import { logger } from "@/lib/logger";

interface DiscoverState {
  articles: Article[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  currentPage: number;
  searchQuery?: string;
  fullDataset: Article[];
  totalEligibleApprox?: number;
  weeksBack: number;
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

function computeHasMoreBasic(offset: number, itemsReturned: number, totalEligibleApprox?: number): boolean {
  if (typeof totalEligibleApprox === 'number' && totalEligibleApprox >= 0) {
    // Primary: use approximate count
    const hasMoreFromCount = offset + itemsReturned < totalEligibleApprox;
    // Fallback heuristic to avoid false negatives due to undercounting
    return hasMoreFromCount || itemsReturned === ARTICLES_PER_PAGE;
  }
  // If no count, fallback heuristic only
  return itemsReturned === ARTICLES_PER_PAGE;
}

export function useDiscoverArticles() {
  const [state, setState] = useState<DiscoverState>({
    articles: [],
    loading: false,
    hasMore: true,
    currentPage: 0,
    fullDataset: [],
    totalEligibleApprox: undefined,
    weeksBack: 1,
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
        logger.info('useDiscoverArticles', `Using cached results for search: ${searchQuery || 'all articles'}`);
        const articles = cachedData.articles.map(article => ({
          ...article,
          date: new Date(article.date) // Convert date string back to Date object
        }));
        if (articles.length > 0) {
          return articles;
        } // Otherwise, continue to return null, triggering another fetch.
      }

      logger.info('useDiscoverArticles', `No cached results found for search: ${searchQuery || 'all articles'}`);

      return null;
    } catch (error) {
      logger.warn('useDiscoverArticles', 'Error reading cache', { error: error instanceof Error ? error.message : String(error) });
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  // Helper function to cache results
  const cacheResults = (articles: Article[], searchQuery?: string) => {
    if (articles.length === 0) {
      logger.warn('useDiscoverArticles', 'No articles to cache');
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
      logger.info('useDiscoverArticles', `Cached ${articles.length} articles for search: ${searchQuery || 'all articles'}`);
    } catch (error) {
      logger.warn('useDiscoverArticles', 'Error caching results', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const fetchArticles = useCallback(async (searchQuery?: string, page = 0, append = false, use_hybrid_search = false) => {
    // Only check cache for general article fetching (no search query)
    // Don't cache search results to ensure fresh results
    if (!append && !searchQuery?.trim()) {
      const cachedArticles = getCachedResults(searchQuery);
      if (cachedArticles) {
        // Use cached first page, but compute hasMore heuristically since cache only has first page now
        const startIndex = page * ARTICLES_PER_PAGE;
        const endIndex = startIndex + ARTICLES_PER_PAGE;
        const pageArticles = cachedArticles.slice(startIndex, endIndex);
        const hasMore = computeHasMoreBasic(startIndex, pageArticles.length, undefined);

        setState({
          articles: pageArticles,
          loading: false,
          hasMore,
          currentPage: page,
          searchQuery,
          fullDataset: [],
          totalEligibleApprox: undefined,
          weeksBack: 1,
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
        logger.info('useDiscoverArticles', `Performing vector search for: "${searchQuery}"`);
        
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

        // For search results, cap to first page and disable load more
        const pageArticles = articles.slice(0, ARTICLES_PER_PAGE);
        setState(prev => ({
          ...prev,
          articles: pageArticles,
          loading: false,
          hasMore: false,
          currentPage: 0,
          error: undefined,
          fullDataset: [],
        }));
        return;
      } else {
        // Fetch paginated generated articles
        const offset = page * ARTICLES_PER_PAGE;
        const weeksBack = append ? state.weeksBack : 1;
        logger.info('useDiscoverArticles', `Fetching paginated articles: limit ${ARTICLES_PER_PAGE}, offset ${offset}, weeksBack ${weeksBack}`);

        const response = await fetch(`/api/fetchArticles?limit=${ARTICLES_PER_PAGE}&offset=${offset}&weeksBack=${weeksBack}`);
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.statusText}`);
        }

        const data: PaginatedArticlesResponse = await response.json();
        articles = data.items || [];

        const hasMore = computeHasMoreBasic(offset, articles.length, data.totalEligibleApprox);
        logger.debug('useDiscoverArticles', 'hasMore computation (initial/non-search)', { offset, returned: articles.length, totalEligibleApprox: data.totalEligibleApprox, hasMore });

        setState(prev => ({
          ...prev,
          articles: append ? [...prev.articles, ...articles] : articles,
          loading: false,
          hasMore,
          currentPage: page,
          error: undefined,
          fullDataset: [],
          totalEligibleApprox: data.totalEligibleApprox,
          weeksBack: data.weeksBackUsed ?? weeksBack,
        }));

        // Cache only when first page and no search
        if (!append && !searchQuery?.trim() && page === 0) {
          cacheResults(articles, searchQuery);
        }
      }

    } catch (error) {
      logger.error('useDiscoverArticles', 'Fetch error', { error: error instanceof Error ? error.message : String(error) });
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Something went wrong",
      }));
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (state.loading) return;

    // For search path: always cap and do not show load more
    if (state.searchQuery && state.searchQuery.trim()) {
      // No-op to keep UI consistent
      return;
    }

    const nextPage = state.currentPage + 1;
    const nextOffset = nextPage * ARTICLES_PER_PAGE;

    // Try fetching next page within current weeksBack
    const response = await fetch(`/api/fetchArticles?limit=${ARTICLES_PER_PAGE}&offset=${nextOffset}&weeksBack=${state.weeksBack}`);
    if (!response.ok) {
      logger.warn('useDiscoverArticles', `Load more failed: ${response.statusText}`);
      setState(prev => ({ ...prev, hasMore: false }));
      return;
    }

    const data: PaginatedArticlesResponse = await response.json();
    const newItems = data.items || [];

    // If we got items, append and compute hasMore
    if (newItems.length > 0) {
      const hasMore = computeHasMoreBasic(nextOffset, newItems.length, data.totalEligibleApprox);
      setState(prev => ({
        ...prev,
        articles: [...prev.articles, ...newItems],
        hasMore,
        currentPage: nextPage,
        totalEligibleApprox: data.totalEligibleApprox,
        weeksBack: data.weeksBackUsed ?? prev.weeksBack,
      }));
      logger.debug('useDiscoverArticles', 'hasMore computation (loadMore within window)', { offset: nextOffset, returned: newItems.length, totalEligibleApprox: data.totalEligibleApprox, hasMore });
      return;
    }

    // If no items returned but we thought there might be more, expand window by +1 week
    const expandedWeeksBack = state.weeksBack + 1;
    const expandedResponse = await fetch(`/api/fetchArticles?limit=${ARTICLES_PER_PAGE}&offset=${state.articles.length}&weeksBack=${expandedWeeksBack}`);
    if (!expandedResponse.ok) {
      setState(prev => ({ ...prev, hasMore: false }));
      return;
    }
    const expandedData: PaginatedArticlesResponse = await expandedResponse.json();
    const expandedItems = expandedData.items || [];

    if (expandedItems.length === 0) {
      setState(prev => ({ ...prev, hasMore: false }));
      return;
    }

    const hasMoreAfterExpand = computeHasMoreBasic(state.articles.length, expandedItems.length, expandedData.totalEligibleApprox);
    setState(prev => ({
      ...prev,
      articles: [...prev.articles, ...expandedItems],
      hasMore: hasMoreAfterExpand,
      currentPage: Math.floor((prev.articles.length + expandedItems.length) / ARTICLES_PER_PAGE),
      totalEligibleApprox: expandedData.totalEligibleApprox,
      weeksBack: expandedData.weeksBackUsed ?? expandedWeeksBack,
    }));
    logger.debug('useDiscoverArticles', 'hasMore computation (after expand window)', { offset: state.articles.length, returned: expandedItems.length, totalEligibleApprox: expandedData.totalEligibleApprox, hasMore: hasMoreAfterExpand });
  }, [state.loading, state.searchQuery, state.currentPage, state.weeksBack, state.articles.length]);

  const search = useCallback((query: string) => {
    // If query is provided, use hybrid search
    // If query is not provided, use dense search
    if (query.trim()) {
      // Cap at ARTICLES_PER_PAGE and disable load more in UI by setting hasMore false
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