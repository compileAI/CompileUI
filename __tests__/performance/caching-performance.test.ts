import { renderHook, act, waitFor } from '@testing-library/react';
import { useDiscoverArticles } from '@/hooks/useDiscoverArticles';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

jest.useFakeTimers();

const mockArticles = Array.from({ length: 100 }, (_, i) => ({
  article_id: `${i + 1}`,
  title: `Article ${i + 1}`,
  content: `Content for article ${i + 1}`,
  date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
  fingerprint: `fp${i + 1}`,
  tag: 'VDB_IMPROVED',
  citations: [],
}));

describe('Caching and Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (fetch as jest.Mock).mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Cache Hit Performance', () => {
    it('should load from cache without fetch calls', async () => {
      // Set up cache
      const cachedData = {
        articles: mockArticles.slice(0, 20),
        timestamp: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      localStorageMock.setItem('compile-discover-articles', JSON.stringify(cachedData));

      const { result } = renderHook(() => useDiscoverArticles());
      
      const startTime = performance.now();
      
      await act(async () => {
        result.current.fetchArticles();
      });

      const endTime = performance.now();
      
      // Should be very fast since no network call
      expect(endTime - startTime).toBeLessThan(10);
      expect(fetch).not.toHaveBeenCalled();
      expect(result.current.articles).toHaveLength(20);
      expect(result.current.loading).toBe(false);
    });

    it('should handle multiple rapid cache access without issues', async () => {
      const cachedData = {
        articles: mockArticles.slice(0, 20),
        timestamp: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      localStorageMock.setItem('compile-discover-articles', JSON.stringify(cachedData));

      // Create multiple hook instances
      const hook1 = renderHook(() => useDiscoverArticles());
      const hook2 = renderHook(() => useDiscoverArticles());
      const hook3 = renderHook(() => useDiscoverArticles());

      const startTime = performance.now();

      // Access cache simultaneously
      await Promise.all([
        act(async () => hook1.result.current.fetchArticles()),
        act(async () => hook2.result.current.fetchArticles()),
        act(async () => hook3.result.current.fetchArticles()),
      ]);

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(fetch).not.toHaveBeenCalled();
      
      // All should have the same cached data
      expect(hook1.result.current.articles).toHaveLength(20);
      expect(hook2.result.current.articles).toHaveLength(20);
      expect(hook3.result.current.articles).toHaveLength(20);
    });
  });

  describe('Pagination Performance', () => {
    it('should efficiently handle large datasets with pagination', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticles,
      });

      const { result } = renderHook(() => useDiscoverArticles());
      
      // Initial load
      await act(async () => {
        result.current.fetchArticles();
      });

      expect(result.current.articles).toHaveLength(20); // First page
      expect(result.current.hasMore).toBe(true);

      // Load more should be fast (from cached full dataset)
      const startTime = performance.now();
      
      await act(async () => {
        result.current.loadMore();
      });

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(result.current.articles).toHaveLength(40); // Two pages
      expect(fetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });

    it('should maintain performance with rapid pagination', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticles,
      });

      const { result } = renderHook(() => useDiscoverArticles());
      
      await act(async () => {
        result.current.fetchArticles();
      });

      const startTime = performance.now();

      // Rapidly load multiple pages
      for (let i = 0; i < 4; i++) {
        if (result.current.hasMore) {
          await act(async () => {
            result.current.loadMore();
          });
        }
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(result.current.articles).toHaveLength(100); // All articles
      expect(result.current.hasMore).toBe(false);
    });
  });


  describe('Memory Management', () => {
    it('should properly clean up expired cache entries', async () => {
      // Set up expired cache
      const expiredCache = {
        articles: mockArticles.slice(0, 10),
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        expiresAt: Date.now() - 60 * 60 * 1000,
      };
      localStorageMock.setItem('compile-discover-articles', JSON.stringify(expiredCache));

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticles.slice(0, 20),
      });

      const { result } = renderHook(() => useDiscoverArticles());
      
      await act(async () => {
        result.current.fetchArticles();
      });

      // Should have cleaned up expired cache
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('compile-discover-articles');
      // Should have made fresh fetch
      expect(fetch).toHaveBeenCalled();
      // Should have new cache
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle large datasets without memory leaks', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockArticles[0],
        article_id: `${i + 1}`,
        title: `Large Article ${i + 1}`,
        content: 'Content '.repeat(100), // Larger content
      }));

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => largeDataset,
      });

      const { result } = renderHook(() => useDiscoverArticles());
      
      const startTime = performance.now();
      
      await act(async () => {
        result.current.fetchArticles();
      });

      const endTime = performance.now();

      // Should handle large dataset efficiently
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.articles).toHaveLength(20); // Only first page in memory
      expect(result.current.hasMore).toBe(true);
    });
  });
}); 