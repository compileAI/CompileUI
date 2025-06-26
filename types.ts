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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Database chat message types
export interface DatabaseChatMessage {
  id: string; // int8 as string
  user_id: string; // uuid
  article_id: string; // int8 as string
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string; // ISO timestamp
}

export interface SaveChatMessageParams {
  user_id: string; // uuid
  article_id: string; // int8 as string
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryParams {
  user_id: string; // uuid
  article_id: string; // int8 as string
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