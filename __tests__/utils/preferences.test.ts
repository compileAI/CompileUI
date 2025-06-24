import {
  isEmpty,
  mapDatabaseToUser,
  mapUserToDatabase,
  detectConflicts,
  resolveConflicts,
  clearArticleCache,
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY
} from '@/utils/preferences';
import { UserPreferences, DatabasePreferences, PreferenceConflict } from '@/types/preferences';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock dispatchEvent
const dispatchEventMock = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: dispatchEventMock
});

describe('Preferences Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isEmpty', () => {
    it('should return true for null values', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined values', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty strings', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only strings', () => {
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\t\n')).toBe(true);
    });

    it('should return false for non-empty strings', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(' hello ')).toBe(false);
    });
  });

  describe('mapDatabaseToUser', () => {
    it('should correctly map database preferences to user format', () => {
      const dbPrefs: DatabasePreferences = {
        content_preferences: 'AI news',
        style_preferences: 'Concise summaries'
      };

      const result = mapDatabaseToUser(dbPrefs);

      expect(result).toEqual({
        contentInterests: 'AI news',
        presentationStyle: 'Concise summaries'
      });
    });

    it('should handle empty database preferences', () => {
      const dbPrefs: DatabasePreferences = {
        content_preferences: '',
        style_preferences: ''
      };

      const result = mapDatabaseToUser(dbPrefs);

      expect(result).toEqual({
        contentInterests: '',
        presentationStyle: ''
      });
    });
  });

  describe('mapUserToDatabase', () => {
    it('should correctly map user preferences to database format', () => {
      const userPrefs: UserPreferences = {
        contentInterests: 'AI news',
        presentationStyle: 'Concise summaries'
      };

      const result = mapUserToDatabase(userPrefs);

      expect(result).toEqual({
        content_preferences: 'AI news',
        style_preferences: 'Concise summaries'
      });
    });
  });

  describe('detectConflicts', () => {
    it('should detect content conflicts when both values are non-empty and different', () => {
      const local: UserPreferences = {
        contentInterests: 'Local content',
        presentationStyle: 'Same style'
      };
      const database: UserPreferences = {
        contentInterests: 'Database content',
        presentationStyle: 'Same style'
      };

      const result = detectConflicts(local, database);

      expect(result.hasContentConflict).toBe(true);
      expect(result.hasStyleConflict).toBe(false);
      expect(result.local).toEqual(local);
      expect(result.database).toEqual(database);
    });

    it('should detect style conflicts when both values are non-empty and different', () => {
      const local: UserPreferences = {
        contentInterests: 'Same content',
        presentationStyle: 'Local style'
      };
      const database: UserPreferences = {
        contentInterests: 'Same content',
        presentationStyle: 'Database style'
      };

      const result = detectConflicts(local, database);

      expect(result.hasContentConflict).toBe(false);
      expect(result.hasStyleConflict).toBe(true);
    });

    it('should detect both conflicts when both content and style differ', () => {
      const local: UserPreferences = {
        contentInterests: 'Local content',
        presentationStyle: 'Local style'
      };
      const database: UserPreferences = {
        contentInterests: 'Database content',
        presentationStyle: 'Database style'
      };

      const result = detectConflicts(local, database);

      expect(result.hasContentConflict).toBe(true);
      expect(result.hasStyleConflict).toBe(true);
    });

    it('should not detect conflicts when values are identical', () => {
      const preferences: UserPreferences = {
        contentInterests: 'Same content',
        presentationStyle: 'Same style'
      };

      const result = detectConflicts(preferences, preferences);

      expect(result.hasContentConflict).toBe(false);
      expect(result.hasStyleConflict).toBe(false);
    });

    it('should not detect conflicts when one value is empty', () => {
      const local: UserPreferences = {
        contentInterests: 'Local content',
        presentationStyle: ''
      };
      const database: UserPreferences = {
        contentInterests: '',
        presentationStyle: 'Database style'
      };

      const result = detectConflicts(local, database);

      expect(result.hasContentConflict).toBe(false);
      expect(result.hasStyleConflict).toBe(false);
    });

    it('should ignore whitespace differences', () => {
      const local: UserPreferences = {
        contentInterests: ' content ',
        presentationStyle: 'style'
      };
      const database: UserPreferences = {
        contentInterests: 'content',
        presentationStyle: 'style'
      };

      const result = detectConflicts(local, database);

      expect(result.hasContentConflict).toBe(false);
      expect(result.hasStyleConflict).toBe(false);
    });
  });

  describe('resolveConflicts', () => {
    const conflict: PreferenceConflict = {
      hasContentConflict: true,
      hasStyleConflict: true,
      local: {
        contentInterests: 'Local content',
        presentationStyle: 'Local style'
      },
      database: {
        contentInterests: 'Database content',
        presentationStyle: 'Database style'
      }
    };

    it('should resolve conflicts based on user choices', () => {
      const resolution = {
        contentChoice: 'local' as const,
        styleChoice: 'database' as const
      };

      const result = resolveConflicts(conflict, resolution);

      expect(result).toEqual({
        contentInterests: 'Local content',
        presentationStyle: 'Database style'
      });
    });

    it('should prefer non-empty values for non-conflicting fields', () => {
      const nonConflictCase: PreferenceConflict = {
        hasContentConflict: false,
        hasStyleConflict: false,
        local: {
          contentInterests: 'Local content',
          presentationStyle: ''
        },
        database: {
          contentInterests: '',
          presentationStyle: 'Database style'
        }
      };

      const result = resolveConflicts(nonConflictCase, {});

      expect(result).toEqual({
        contentInterests: 'Local content',
        presentationStyle: 'Database style'
      });
    });

    it('should handle mixed conflict and non-conflict scenarios', () => {
      const mixedConflict: PreferenceConflict = {
        hasContentConflict: true,
        hasStyleConflict: false,
        local: {
          contentInterests: 'Local content',
          presentationStyle: 'Local style'
        },
        database: {
          contentInterests: 'Database content',
          presentationStyle: ''
        }
      };

      const resolution = {
        contentChoice: 'database' as const
      };

      const result = resolveConflicts(mixedConflict, resolution);

      expect(result).toEqual({
        contentInterests: 'Database content',
        presentationStyle: 'Local style'
      });
    });
  });

  describe('clearArticleCache', () => {
    it('should remove the cache item and dispatch event', () => {
      clearArticleCache();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('compile-enhanced-articles');
      expect(dispatchEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cacheUpdated',
          detail: null
        })
      );
    });
  });

  describe('Constants', () => {
    it('should export correct constants', () => {
      expect(PREFERENCES_KEY).toBe('compile-user-preferences');
      expect(DEFAULT_PREFERENCES).toEqual({
        contentInterests: expect.any(String),
        presentationStyle: expect.any(String)
      });
      expect(DEFAULT_PREFERENCES.contentInterests).toBeTruthy();
      expect(DEFAULT_PREFERENCES.presentationStyle).toBeTruthy();
    });
  });
}); 