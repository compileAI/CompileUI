import { Article } from "@/types";

/**
 * Reciprocal Rank Fusion (RRF) algorithm for combining search results
 * 
 * RRF score = sum(1 / (k + rank_i)) for each list i
 * where rank_i is the position (1-indexed) in list i
 * 
 * @param denseResults Results from dense vector search
 * @param sparseResults Results from sparse BM25 search  
 * @param k RRF constant (default 60)
 * @returns Fused and ranked results
 */
export function reciprocalRankFusion(
  denseResults: Article[],
  sparseResults: Article[],
  k: number = 60
): Article[] {
  const scoreMap = new Map<string, { article: Article; score: number; denseRank?: number; sparseRank?: number }>();
  
  // Process dense results
  denseResults.forEach((article, index) => {
    const rank = index + 1; // 1-indexed ranking
    const score = 1 / (k + rank);
    
    scoreMap.set(article.article_id, {
      article,
      score,
      denseRank: rank
    });
  });
  
  // Process sparse results and add to scores
  sparseResults.forEach((article, index) => {
    const rank = index + 1; // 1-indexed ranking
    const score = 1 / (k + rank);
    
    const existing = scoreMap.get(article.article_id);
    if (existing) {
      // Article exists in both lists - add to score
      existing.score += score;
      existing.sparseRank = rank;
    } else {
      // Article only in sparse list
      scoreMap.set(article.article_id, {
        article,
        score,
        sparseRank: rank
      });
    }
  });
  
  // Convert to array and sort by RRF score (descending)
  const fusedResults = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(item => item.article);
  
  return fusedResults;
}

/**
 * Enhanced RRF that handles cases where one list is shorter than the other
 * 
 * If one list returns fewer results than the other, we:
 * 1. Apply RRF to the minimum length
 * 2. Append remaining results from the longer list (excluding duplicates)
 * 
 * @param denseResults Results from dense vector search
 * @param sparseResults Results from sparse BM25 search
 * @param k RRF constant (default 60)
 * @returns Fused and ranked results
 */
export function reciprocalRankFusionWithFallback(
  denseResults: Article[],
  sparseResults: Article[],
  k: number = 60
): Article[] {
  const minLength = Math.min(denseResults.length, sparseResults.length);
  
  if (minLength === 0) {
    // If one list is empty, return the other
    return denseResults.length > 0 ? denseResults : sparseResults;
  }
  
  // Apply RRF to the minimum length
  const denseMin = denseResults.slice(0, minLength);
  const sparseMin = sparseResults.slice(0, minLength);
  const rrfResults = reciprocalRankFusion(denseMin, sparseMin, k);
  
  // If both lists are the same length, we're done
  if (denseResults.length === sparseResults.length) {
    return rrfResults;
  }
  
  // Determine which list is longer and get the extra results
  const longerList = denseResults.length > sparseResults.length ? denseResults : sparseResults;
  const extraResults = longerList.slice(minLength);
  
  // Create a set of already included article IDs for deduplication
  const includedIds = new Set(rrfResults.map(article => article.article_id));
  
  // Append extra results that aren't already included
  const finalResults = [...rrfResults];
  for (const article of extraResults) {
    if (!includedIds.has(article.article_id)) {
      finalResults.push(article);
      includedIds.add(article.article_id);
    }
  }
  
  return finalResults;
}


