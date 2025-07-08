export interface Citation {
  sourceName: string;
  articleTitle: string;
  url: string | null;
}

export interface Article { // This is GenArticle
  article_id: string;
  date: Date;
  title: string;
  content: string;
  fingerprint: string;
  tag: string;
  citations: Citation[];
}

export interface EnhancedArticle extends Article {
  tuned: string;
}

// New type for enhanced articles from the database API
export interface DatabaseEnhancedArticle {
  id: string;
  user_id: string | null;
  gen_article_id: string;
  title: string;
  content: string; // This is the enhanced content
  citations: Citation[] | null;
  content_preferences_hash: string;
  style_preferences_hash: string;
  similarity_score: number | null;
  generated_at: string;
  expires_at: string | null;
  enhancement_metadata: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SourceArticleDB { // Renaming to avoid confusion with the simplified type below
  id: string; // Corresponds to source_articles.id
  published: string | null; // Keep as string from DB, format later if needed
  title: string | null;
  content: string | null;
  author: string | null;
  source_id: number; // Assuming this is bigint from master_sources.id
  url: string | null;
  tags: string[] | null;
  created_at: string; // Keep as string from DB
}

// This is the simplified version you for giving Gemini context
export interface SourceArticleContext {
  id: string;
  title: string | null;
  content: string | null;
  author: string | null;
  url: string | null;
}