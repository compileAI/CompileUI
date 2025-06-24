import { renderHook, act, waitFor } from '@testing-library/react';
import { useDiscoverArticles } from '@/hooks/useDiscoverArticles';
import { Article } from '@/types';

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
    // Expose store for testing
    _store: store,
    _clearStore: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const createMockArticles = (count: number, testId?: string): Article[] => 
  Array.from({ length: count }, (_, i) => ({
    article_id: `${testId || 'default'}-${i + 1}`,
    title: `Article ${i + 1}${testId ? ` (${testId})` : ''}`,
    content: `Content for article ${i + 1}`,
    date: new Date(`2024-01-${String((i % 30) + 1).padStart(2, '0')}`),
    fingerprint: `fp${i + 1}`,
    tag: 'VDB_IMPROVED',
    citations: [],
  }));

describe('useDiscoverArticles - Pagination Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock._clearStore();
    // Completely reset fetch mock
    (fetch as jest.Mock).mockReset();
  });

  describe('Initial Load - Should show exactly 20 articles', () => {
    it('should show only first 20 articles when fetching 100 articles', async () => {
      const mockArticles = createMockArticles(100, 'test100');
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticles,
      });

      const { result } = renderHook(() => useDiscoverArticles());
      
      await act(async () => {
        result.current.fetchArticles();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should display exactly 20 articles (first page)
      expect(result.current.articles).toHaveLength(20);
      expect(result.current.articles[0].article_id).toBe('test100-1');
      expect(result.current.articles[19].article_id).toBe('test100-20');
      
      // Should indicate more articles available
      expect(result.current.hasMore).toBe(true);
      expect(result.current.currentPage).toBe(0);
    });

    it('should show all articles when total is less than 20', async () => {
      const mockArticles = createMockArticles(15, 'test15');
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticles,
      });

      const { result } = renderHook(() => useDiscoverArticles());
      
      await act(async () => {
        result.current.fetchArticles();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.articles).toHaveLength(15);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.currentPage).toBe(0);
    });
  });

  describe('Load More - Should add 20 more articles each time', () => {
    it('should add exactly 20 more articles on first loadMore', async () => {
      const mockArticles = createMockArticles(100, 'loadMore100');
      
      // Mock for initial fetch and loadMore fetch
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockArticles,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockArticles,
        });

      const { result } = renderHook(() => useDiscoverArticles());
      
      // Initial load
      await act(async () => {
        result.current.fetchArticles();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.articles).toHaveLength(20);
      
      // Load more
      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should now have 40 articles total
      expect(result.current.articles).toHaveLength(40);
      expect(result.current.articles[0].article_id).toBe('loadMore100-1');   // First article
      expect(result.current.articles[19].article_id).toBe('loadMore100-20'); // End of first page
      expect(result.current.articles[20].article_id).toBe('loadMore100-21'); // Start of second page
      expect(result.current.articles[39].article_id).toBe('loadMore100-40'); // End of second page
      
      expect(result.current.hasMore).toBe(true);
      expect(result.current.currentPage).toBe(1);
    });

    it('should handle partial last page correctly', async () => {
      const mockArticles = createMockArticles(35, 'partial35'); // 20 + 15
      
      (fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: async () => mockArticles,
        });

      const { result } = renderHook(() => useDiscoverArticles());
      
      // Initial load (20 articles)
      await act(async () => {
        result.current.fetchArticles();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.articles).toHaveLength(20);
      expect(result.current.hasMore).toBe(true);
      
      // Load more (should add remaining 15)
      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.articles).toHaveLength(35);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('Cache Behavior - Should paginate cached results too', () => {
    it('should show only first 20 articles even when loading from cache', async () => {
      const mockArticles = createMockArticles(100, 'cache100');
      
      // Set up cache with 100 articles
      const cachedData = {
        articles: mockArticles,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      localStorageMock.setItem('compile-discover-articles', JSON.stringify(cachedData));

      const { result } = renderHook(() => useDiscoverArticles());
      
      await act(async () => {
        result.current.fetchArticles();
      });

      // Should load from cache but still only show 20 articles
      expect(result.current.articles).toHaveLength(20);
      expect(result.current.articles[0].article_id).toBe('cache100-1');
      expect(result.current.articles[19].article_id).toBe('cache100-20');
      expect(result.current.hasMore).toBe(true);
      expect(result.current.currentPage).toBe(0);
      expect(fetch).not.toHaveBeenCalled(); // Should use cache, not fetch
    });

    it('should load more from cache without additional fetches', async () => {
      const mockArticles = createMockArticles(100, 'cacheLoadMore');
      
      // Set up cache
      const cachedData = {
        articles: mockArticles,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      localStorageMock.setItem('compile-discover-articles', JSON.stringify(cachedData));

      const { result } = renderHook(() => useDiscoverArticles());
      
      // Initial load from cache
      await act(async () => {
        result.current.fetchArticles();
      });

      expect(result.current.articles).toHaveLength(20);
      
      // Load more should use cache, not fetch
      await act(async () => {
        result.current.loadMore();
      });

      expect(result.current.articles).toHaveLength(40);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.currentPage).toBe(1);
      expect(fetch).not.toHaveBeenCalled(); // Should never fetch when cache is available
    });
  });

  describe('Edge Cases', () => {
    it('should not call loadMore when hasMore is false', async () => {
      const mockArticles = createMockArticles(20, 'edge20'); // Exactly 20 articles
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArticles,
      });

      const { result } = renderHook(() => useDiscoverArticles());
      
      await act(async () => {
        result.current.fetchArticles();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.articles).toHaveLength(20);
      expect(result.current.hasMore).toBe(false);

      const fetchCallCount = (fetch as jest.Mock).mock.calls.length;
      
      // Try to load more when hasMore is false
      await act(async () => {
        result.current.loadMore();
      });

      // Should not make additional fetch calls
      expect((fetch as jest.Mock).mock.calls.length).toBe(fetchCallCount);
      expect(result.current.articles).toHaveLength(20); // Should remain the same
    });

    it('should not call loadMore when already loading', async () => {
      const mockArticles = createMockArticles(100, 'loading100');
      
      // Make fetch slow to test loading state
      (fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockArticles,
          }), 100)
        )
      );

      const { result } = renderHook(() => useDiscoverArticles());
      
      // Start initial load
      act(() => {
        result.current.fetchArticles();
      });

      // Try to load more while still loading
      act(() => {
        result.current.loadMore();
      });

      // Should only have one fetch call despite multiple loadMore attempts
      expect((fetch as jest.Mock).mock.calls.length).toBe(1);
    });
  });
}); 