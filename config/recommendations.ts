export const RECOMMENDATIONS_CONFIG = {
  DEFAULT_COUNT: 3,
  MAX_RECENTLY_VISITED: 4,
  VECTOR_SEARCH_MULTIPLIER: 3, // Fetch 3x to ensure enough after filtering
  LOADING_SKELETON_COUNT: 3,
} as const;

export const RECENTLY_VISITED_KEY = 'compile-recently-visited';
export const MAX_RECENT_ARTICLES = RECOMMENDATIONS_CONFIG.MAX_RECENTLY_VISITED; 