/**
 * Tokenizes text using lowercase + \w+ regex (no stemming)
 * This matches the tokenization rule used during ingestion
 */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\w+/g) ?? [];
}


