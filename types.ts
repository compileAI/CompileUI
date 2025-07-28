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

// Raw database response structure for articles with nested citations from Supabase joins
// Used when fetching from gen_articles with citations_ref -> source_articles -> master_sources
export interface ArticleWithCitations {
  article_id: string;
  date: string;
  title: string;
  content: string;
  fingerprint: string;
  tag: string;
  citations: Array<{
    source_articles: {
      title: string | null;
      url: string | null;
      master_sources: {
        name: string;
      };
    };
  }>;
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

export interface FAQ {
  id: string; // uuid as string
  gen_article_id: string; // int8 as string 
  question: string;
  answer: string;
  created_at: string;
  question_short: string;
}

// Automation types
export type AutomationType = 'SEMANTIC_SUMMARY';

export interface AutomationParams {
  retrieval_prompt: string;
  content_prompt: string;
  style_prompt: string;
  name: string; // Add name to params
}

export interface Automation {
  id: string; // int8 as string
  created_at: string;
  user_id: string; // uuid
  type: AutomationType;
  params: AutomationParams;
  card_number: number; // smallint
  active: boolean;
  updated_at: string;
}

export interface AutomationContent {
  id: string; // int8 as string
  automation_id: string; // int8 as string
  user_id: string; // uuid
  card_number: number; // smallint
  title: string;
  content: string;
  created_at: string;
}

// API request/response types for automations
export interface CreateAutomationRequest {
  type: AutomationType;
  params: AutomationParams;
  card_number: number;
  active?: boolean;
}

export interface UpdateAutomationRequest {
  params?: AutomationParams;
  active?: boolean;
}

export interface AutomationApiResponse {
  success: boolean;
  automation?: Automation;
  error?: string;
}

export interface AutomationsApiResponse {
  success: boolean;
  automations?: Automation[];
  error?: string;
}

export interface AutomationContentApiResponse {
  success: boolean;
  content?: AutomationContent | null;
  error?: string;
}

export interface VectorSearchResponse {
  articleIds: string[];
  scores: (number | undefined)[];
}

export interface HlcArticle {
  id: string;
  created_at: string;
  topic: string;
  title: string;
  content: string;
  gen_article_ids: string[];
  articles?: Article[]; // Populated gen_articles with rehydrated citations
}

export interface HlcArticlesResponse {
  success: boolean;
  summaries?: HlcArticle[];
  error?: string;
}