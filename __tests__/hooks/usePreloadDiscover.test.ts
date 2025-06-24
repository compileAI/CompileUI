import { renderHook, act, waitFor } from '@testing-library/react';
import { usePreloadDiscover } from '@/hooks/usePreloadDiscover';

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

// Mock setTimeout
jest.useFakeTimers();

const mockArticles = [
  { article_id: '1', title: 'Article 1' },
  { article_id: '2', title: 'Article 2' },
];

describe('usePreloadDiscover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (fetch as jest.Mock).mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should trigger preload with specified delay', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles,
    });

    const { result } = renderHook(() => usePreloadDiscover());
    
    act(() => {
      result.current.triggerPreload(1000);
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/fetchArticles');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'compile-discover-articles',
      expect.stringContaining('"articles"')
    );
  });

  it('should skip preload if cache already exists', () => {
    const existingCache = {
      articles: mockArticles,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    };
    localStorageMock.setItem('compile-discover-articles', JSON.stringify(existingCache));

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const { result } = renderHook(() => usePreloadDiscover());
    
    act(() => {
      result.current.triggerPreload(100);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping preload - already done or cached')
    );

    consoleSpy.mockRestore();
  });

  it('should preload if cache is expired', async () => {
    const expiredCache = {
      articles: mockArticles,
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      expiresAt: Date.now() - 60 * 60 * 1000, // Expired 1 hour ago
    };
    localStorageMock.setItem('compile-discover-articles', JSON.stringify(expiredCache));

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles,
    });

    const { result } = renderHook(() => usePreloadDiscover());
    
    act(() => {
      result.current.triggerPreload(100);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/fetchArticles');
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('compile-discover-articles');
  });

  it('should handle preload errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Preload failed'));
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { result } = renderHook(() => usePreloadDiscover());
    
    act(() => {
      result.current.triggerPreload(100);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background preload failed:'),
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should cache preloaded articles with correct expiration', async () => {
    const mockNow = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(mockNow);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles,
    });

    const { result } = renderHook(() => usePreloadDiscover());
    
    await act(async () => {
      result.current.preloadDiscoverArticles();
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    const cachedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(cachedData).toEqual({
      articles: mockArticles,
      timestamp: mockNow,
      expiresAt: mockNow + 60 * 60 * 1000, // 1 hour later
    });

    jest.restoreAllMocks();
  });

  it('should only preload once per hook instance', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockArticles,
    });

    const { result } = renderHook(() => usePreloadDiscover());
    
    // First preload
    await act(async () => {
      result.current.preloadDiscoverArticles();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Second preload attempt should be skipped
    await act(async () => {
      result.current.preloadDiscoverArticles();
    });

    expect(fetch).toHaveBeenCalledTimes(1); // Should still be 1
  });

  it('should handle malformed cache data gracefully', async () => {
    localStorageMock.setItem('compile-discover-articles', 'invalid-json');

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles,
    });

    const { result } = renderHook(() => usePreloadDiscover());
    
    act(() => {
      result.current.triggerPreload(100);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/fetchArticles');
    });

    // Should proceed with preload despite malformed cache
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
}); 