import { RECENTLY_VISITED_KEY, MAX_RECENT_ARTICLES } from '@/config/recommendations';

export { RECENTLY_VISITED_KEY, MAX_RECENT_ARTICLES };

/**
 * Get the list of recently visited article IDs
 * @returns Array of article IDs in order of most recent first
 */
export function getRecentlyVisited(): string[] {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return [];
    }
    
    const stored = sessionStorage.getItem(RECENTLY_VISITED_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Error reading recently visited articles:', error);
    return [];
  }
}

/**
 * Add an article ID to the recently visited list
 * Moves to front if already exists, maintains max length
 * @param articleId - The article ID to add
 */
export function addRecentlyVisited(articleId: string): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    
    const recent = getRecentlyVisited();
    
    // Remove the article if it already exists
    const filtered = recent.filter(id => id !== articleId);
    
    // Add to the beginning
    const updated = [articleId, ...filtered];
    
    // Limit to max length
    const trimmed = updated.slice(0, MAX_RECENT_ARTICLES);
    
    sessionStorage.setItem(RECENTLY_VISITED_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Error storing recently visited article:', error);
    // Fail silently to not break the app
  }
}

/**
 * Clear all recently visited articles
 */
export function clearRecentlyVisited(): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    
    sessionStorage.removeItem(RECENTLY_VISITED_KEY);
  } catch (error) {
    console.warn('Error clearing recently visited articles:', error);
  }
} 