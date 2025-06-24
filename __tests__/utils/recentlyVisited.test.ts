import { 
  addRecentlyVisited, 
  getRecentlyVisited, 
  clearRecentlyVisited,
  RECENTLY_VISITED_KEY,
  MAX_RECENT_ARTICLES 
} from '@/utils/recentlyVisited';

// Mock sessionStorage
let mockStore: Record<string, string> = {};

const mockSessionStorage = {
  getItem: jest.fn((key: string) => mockStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: jest.fn(() => {
    mockStore = {};
  })
};

// Replace sessionStorage with mock
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

describe('recentlyVisited', () => {
  beforeEach(() => {
    mockStore = {};
    jest.clearAllMocks();
    
    // Reset all mock implementations to default
    mockSessionStorage.setItem.mockImplementation((key: string, value: string) => {
      mockStore[key] = value;
    });
    mockSessionStorage.getItem.mockImplementation((key: string) => {
      return mockStore[key] || null;
    });
  });

  describe('getRecentlyVisited', () => {
    it('should return empty array when no items stored', () => {
      const result = getRecentlyVisited();
      expect(result).toEqual([]);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(RECENTLY_VISITED_KEY);
    });

    it('should return stored articles in correct order', () => {
      mockSessionStorage.setItem(RECENTLY_VISITED_KEY, JSON.stringify(['article2', 'article1']));
      const result = getRecentlyVisited();
      expect(result).toEqual(['article2', 'article1']);
    });

    it('should handle invalid JSON gracefully', () => {
      mockSessionStorage.setItem(RECENTLY_VISITED_KEY, 'invalid-json');
      const result = getRecentlyVisited();
      expect(result).toEqual([]);
    });
  });

  describe('addRecentlyVisited', () => {
    it('should add first article to empty list', () => {
      addRecentlyVisited('article1');
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        RECENTLY_VISITED_KEY,
        JSON.stringify(['article1'])
      );
    });

    it('should add article to beginning and remove duplicates', () => {
      mockSessionStorage.setItem(RECENTLY_VISITED_KEY, JSON.stringify(['article2', 'article1']));
      
      addRecentlyVisited('article1'); // Should move to front
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        RECENTLY_VISITED_KEY,
        JSON.stringify(['article1', 'article2'])
      );
    });

    it('should limit list to MAX_RECENT_ARTICLES', () => {
      const existingArticles = Array.from(
        { length: MAX_RECENT_ARTICLES }, 
        (_, i) => `article${i + 1}`
      );
      mockSessionStorage.setItem(RECENTLY_VISITED_KEY, JSON.stringify(existingArticles));
      
      addRecentlyVisited('newArticle');
      
      const expectedArticles = ['newArticle', ...existingArticles.slice(0, MAX_RECENT_ARTICLES - 1)];
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        RECENTLY_VISITED_KEY,
        JSON.stringify(expectedArticles)
      );
    });

    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      expect(() => addRecentlyVisited('article1')).not.toThrow();
    });
  });

  describe('clearRecentlyVisited', () => {
    it('should remove recently visited items', () => {
      mockStore[RECENTLY_VISITED_KEY] = JSON.stringify(['article1', 'article2']);
      
      clearRecentlyVisited();
      
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(RECENTLY_VISITED_KEY);
    });
  });

  describe('constants', () => {
    it('should have correct MAX_RECENT_ARTICLES value', () => {
      expect(MAX_RECENT_ARTICLES).toBe(4);
    });

    it('should have correct storage key', () => {
      expect(RECENTLY_VISITED_KEY).toBe('compile-recently-visited');
    });
  });
}); 