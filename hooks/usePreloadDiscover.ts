import { useEffect, useRef } from 'react';

const CACHE_KEY = "compile-discover-articles";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface CachedDiscoverResult {
  articles: unknown[];
  timestamp: number;
  expiresAt: number;
  searchQuery?: string;
}

export function usePreloadDiscover() {
  const hasPreloaded = useRef(false);

  const checkIfCacheExists = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;

      const cachedData: CachedDiscoverResult = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > cachedData.expiresAt) {
        localStorage.removeItem(CACHE_KEY);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  const preloadDiscoverArticles = async () => {
    if (hasPreloaded.current || checkIfCacheExists()) {
      console.log('[usePreloadDiscover] Skipping preload - already done or cached');
      return;
    }

    try {
      console.log('[usePreloadDiscover] Starting background preload of discover articles');
      
      const response = await fetch('/api/fetchArticles');
      if (!response.ok) {
        throw new Error(`Preload failed: ${response.statusText}`);
      }

      const articles = await response.json();
      
      // Cache the preloaded articles
      const cacheData: CachedDiscoverResult = {
        articles,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[usePreloadDiscover] Successfully preloaded and cached ${articles.length} discover articles`);
      
      hasPreloaded.current = true;
    } catch (error) {
      console.warn('[usePreloadDiscover] Background preload failed:', error);
      // Don't throw - this is a background operation
    }
  };

  const triggerPreload = (delay = 2000) => {
    console.log(`[usePreloadDiscover] Scheduling preload in ${delay}ms`);
    setTimeout(preloadDiscoverArticles, delay);
  };

  return {
    triggerPreload,
    preloadDiscoverArticles,
  };
} 