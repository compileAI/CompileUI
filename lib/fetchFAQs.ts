import { FAQ } from '@/types';

/**
 * Deterministic random selection based on article ID
 * This ensures consistent FAQ selection across page refreshes
 */
function deterministicRandom(seed: string, index: number): number {
  let hash = 0;
  const combined = seed + index.toString();
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Select up to 3 FAQs deterministically based on article ID
 */
export function selectFAQs(faqs: FAQ[], articleId: string): FAQ[] {
  if (faqs.length === 0) return [];
  if (faqs.length <= 3) return faqs;

  // Create indices array and shuffle deterministically
  const indices = Array.from({ length: faqs.length }, (_, i) => i);
  
  // Deterministic shuffle using article ID as seed
  for (let i = indices.length - 1; i > 0; i--) {
    const randomValue = deterministicRandom(articleId, i);
    const j = randomValue % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Take first 3 indices and return corresponding FAQs
  return indices.slice(0, 3).map(index => faqs[index]);
}

/**
 * Fetch FAQs for a given article ID
 */
export async function fetchFAQsForArticle(articleId: string): Promise<FAQ[]> {
  try {
    const response = await fetch(`/api/faqs?articleId=${articleId}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch FAQs for article ${articleId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error(`FAQ API returned error for article ${articleId}:`, data.error);
      return [];
    }

    const allFAQs: FAQ[] = data.faqs || [];
    return selectFAQs(allFAQs, articleId);
    
  } catch (error) {
    console.error(`Error fetching FAQs for article ${articleId}:`, error);
    return [];
  }
} 