import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";

export type SparseVector = { indices: number[]; values: number[] };

export interface Bm25Params {
  termIdByTerm: Map<string, number>;
  dfByTerm: Map<string, number>;
  N: number;
  k1: number;
  b: number;
}

/**
 * Calculate IDF using the standard BM25 formula
 */
function idf(N: number, df: number): number {
  return Math.log(((N - df + 0.5) / (df + 0.5)) + 1);
}

/**
 * Build BM25 sparse query vector from tokenized query
 */
export function buildBm25QueryVector(
  tokens: string[],
  termIdByTerm: Map<string, number>,   // from Supabase
  dfByTerm: Map<string, number>,       // from Supabase
  N: number,                           // from bm25_stats
  k3 = 1000,
  maxTerms = 128
): SparseVector {
  // Calculate query term frequencies
  const qtf = new Map<string, number>();
  for (const t of tokens) qtf.set(t, (qtf.get(t) ?? 0) + 1);

  // Optional cap by qtf then idf
  let entries = Array.from(qtf.entries());
  if (entries.length > maxTerms) {
    entries.sort((a, b) => {
      const [ta, qa] = a, [tb, qb] = b;
      if (qb !== qa) return qb - qa;
      return idf(N, dfByTerm.get(tb) ?? 0) - idf(N, dfByTerm.get(ta) ?? 0);
    });
    entries = entries.slice(0, maxTerms);
  }

  const indices: number[] = [];
  const values: number[] = [];

  for (const [t, qf] of entries) {
    const tid = termIdByTerm.get(t);
    const df = dfByTerm.get(t);
    if (tid == null || df == null) continue;
    
    const idfVal = idf(N, df);
    if (idfVal <= 0) continue;

    const qtfWeight = (k3 + 1) * qf / (k3 + qf); // ≈1 when k3 large
    indices.push(tid);
    values.push(idfVal * qtfWeight);
  }

  return { indices, values };
}

/**
 * Fetch BM25 parameters from Supabase for given tokens
 */
export async function fetchBm25Params(tokens: string[]): Promise<Bm25Params> {
  if (tokens.length === 0) {
    throw new Error('No tokens provided for BM25 parameter fetch');
  }

  const supabase = await createSupabaseServerClient();
  
  // Fetch term data for all tokens
  const { data: termData, error: termError } = await supabase
    .from('bm25_terms')
    .select('term, term_id, df')
    .in('term', tokens);

  if (termError) {
    logger.error('BM25', 'Error fetching term data', { error: termError });
    throw new Error('Failed to fetch BM25 term data from database');
  }

  // Fetch BM25 stats
  const { data: statsData, error: statsError } = await supabase
    .from('bm25_stats')
    .select('n_docs, k1, b')
    .eq('id', 1)
    .single();

  if (statsError) {
    logger.error('BM25', 'Error fetching stats data', { error: statsError });
    throw new Error('Failed to fetch BM25 stats from database');
  }

  if (!statsData) {
    throw new Error('No BM25 stats found in database');
  }

  // Build maps for efficient lookup
  const termIdByTerm = new Map<string, number>();
  const dfByTerm = new Map<string, number>();

  if (termData) {
    for (const row of termData) {
      termIdByTerm.set(row.term, row.term_id);
      dfByTerm.set(row.term, row.df);
    }
  }

  return {
    termIdByTerm,
    dfByTerm,
    N: statsData.n_docs,
    k1: statsData.k1,
    b: statsData.b
  };
}


