import { UserPreferences, DatabasePreferences, PreferenceConflict } from '@/types/preferences';

export const PREFERENCES_KEY = "compile-user-preferences";
export const DEFAULT_CONTENT_INTERESTS = "News about AI models, deals, investments, discourse and all other information";
export const DEFAULT_PRESENTATION_STYLE = "Summarize the key points in a clear, concise manner with actionable insights";

export const DEFAULT_PREFERENCES: UserPreferences = {
  contentInterests: DEFAULT_CONTENT_INTERESTS,
  presentationStyle: DEFAULT_PRESENTATION_STYLE
};

/**
 * Check if a preference value is considered empty
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Map database preferences to user preferences format
 */
export function mapDatabaseToUser(dbPrefs: DatabasePreferences): UserPreferences {
  return {
    contentInterests: dbPrefs.content_preferences || '',
    presentationStyle: dbPrefs.style_preferences || ''
  };
}

/**
 * Map user preferences to database format
 */
export function mapUserToDatabase(userPrefs: UserPreferences): DatabasePreferences {
  return {
    content_preferences: userPrefs.contentInterests,
    style_preferences: userPrefs.presentationStyle
  };
}

/**
 * Detect conflicts between local and database preferences
 * Only considers it a conflict if both values are non-empty and different
 */
export function detectConflicts(
  local: UserPreferences, 
  database: UserPreferences
): PreferenceConflict {
  const hasContentConflict = 
    !isEmpty(local.contentInterests) && 
    !isEmpty(database.contentInterests) && 
    local.contentInterests.trim() !== database.contentInterests.trim();

  const hasStyleConflict = 
    !isEmpty(local.presentationStyle) && 
    !isEmpty(database.presentationStyle) && 
    local.presentationStyle.trim() !== database.presentationStyle.trim();

  return {
    hasContentConflict,
    hasStyleConflict,
    local,
    database
  };
}

/**
 * Resolve conflicts by merging preferences based on choices
 * For non-conflicting fields, prefer non-empty values
 */
export function resolveConflicts(
  conflict: PreferenceConflict,
  resolution: { contentChoice?: 'local' | 'database'; styleChoice?: 'local' | 'database' }
): UserPreferences {
  const { local, database } = conflict;
  
  // Resolve content interests
  let contentInterests: string;
  if (conflict.hasContentConflict) {
    contentInterests = resolution.contentChoice === 'local' ? local.contentInterests : database.contentInterests;
  } else {
    // No conflict: prefer non-empty value
    contentInterests = !isEmpty(local.contentInterests) ? local.contentInterests : database.contentInterests;
  }

  // Resolve presentation style
  let presentationStyle: string;
  if (conflict.hasStyleConflict) {
    presentationStyle = resolution.styleChoice === 'local' ? local.presentationStyle : database.presentationStyle;
  } else {
    // No conflict: prefer non-empty value
    presentationStyle = !isEmpty(local.presentationStyle) ? local.presentationStyle : database.presentationStyle;
  }

  return {
    contentInterests: contentInterests || '',
    presentationStyle: presentationStyle || ''
  };
}

/**
 * Clear the articles cache to trigger refresh
 */
export function clearArticleCache(): void {
  localStorage.removeItem("compile-enhanced-articles");
  window.dispatchEvent(new CustomEvent('cacheUpdated', { detail: null }));
} 