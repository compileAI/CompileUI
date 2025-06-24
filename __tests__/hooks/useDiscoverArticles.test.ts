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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const mockArticles: Article[] = [
  {
    article_id: '1',
    title: 'Test Article 1',
    content: 'Content 1',
    date: new Date('2024-01-01'),
    fingerprint: 'fp1',
    tag: 'VDB_IMPROVED',
    citations: [],
  },
  {
    article_id: '2',
    title: 'Test Article 2',
    content: 'Content 2',
    date: new Date('2024-01-02'),
    fingerprint: 'fp2',
    tag: 'DSPY',
    citations: [],
  },
];

describe('useDiscoverArticles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (fetch as jest.Mock).mockClear();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useDiscoverArticles());
    
    expect(result.current.articles).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.error).toBeUndefined();
  });

  it('should fetch articles successfully', async () => {
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

    expect(result.current.articles).toHaveLength(2);
    expect(result.current.error).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith('/api/fetchArticles');
  });

  it('should handle search queries with vector search', async () => {
    const searchResults = [mockArticles[0]];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articles: searchResults }),
    });

    const { result } = renderHook(() => useDiscoverArticles());
    
    await act(async () => {
      result.current.search('AI technology');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.articles).toHaveLength(1);
    expect(result.current.searchQuery).toBe('AI technology');
    expect(fetch).toHaveBeenCalledWith('/api/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'AI technology',
        limit: 20,
      }),
    });
  });

  it('should use cached results when available', async () => {
    const cachedData = {
      articles: mockArticles,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    };
    
    localStorageMock.setItem('compile-discover-articles', JSON.stringify(cachedData));

    const { result } = renderHook(() => useDiscoverArticles());
    
    await act(async () => {
      result.current.fetchArticles();
    });

    expect(result.current.articles).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(fetch).not.toHaveBeenCalled(); // Should not fetch due to cache
  });

  it('should ignore expired cache', async () => {
    const expiredCachedData = {
      articles: mockArticles,
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      expiresAt: Date.now() - 60 * 60 * 1000, // Expired 1 hour ago
    };
    
    localStorageMock.setItem('compile-discover-articles', JSON.stringify(expiredCachedData));

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

    expect(fetch).toHaveBeenCalled(); // Should fetch due to expired cache
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('compile-discover-articles');
  });

  it('should handle pagination with loadMore', async () => {
    // Create many articles to test pagination
    const manyArticles = Array.from({ length: 25 }, (_, i) => ({
      ...mockArticles[0],
      article_id: `${i + 1}`,
      title: `Article ${i + 1}`,
    }));

    // Mock the fetch for both initial call and loadMore call
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => manyArticles,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => manyArticles,
      });

    const { result } = renderHook(() => useDiscoverArticles());
    
    // Initial fetch
    await act(async () => {
      result.current.fetchArticles();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.articles).toHaveLength(20); // First page
    expect(result.current.hasMore).toBe(true);
    expect(result.current.currentPage).toBe(0);

    // Load more should call fetch again and append results
    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.articles).toHaveLength(25); // Should now have all articles (20 + 5)
    expect(result.current.hasMore).toBe(false);
    expect(result.current.currentPage).toBe(1);
  });

  it('should handle fetch errors gracefully', async () => {
    const errorMessage = 'Fetch failed';
    (fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useDiscoverArticles());
    
    await act(async () => {
      result.current.fetchArticles();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.articles).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should refresh and clear cache', async () => {
    // Set up cache first
    const cachedData = {
      articles: mockArticles,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    localStorageMock.setItem('compile-discover-articles', JSON.stringify(cachedData));

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles,
    });

    const { result } = renderHook(() => useDiscoverArticles());
    
    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('compile-discover-articles');
    expect(fetch).toHaveBeenCalled(); // Should fetch even with cache due to refresh
  });
}); 