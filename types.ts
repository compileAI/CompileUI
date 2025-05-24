export interface Article {
  article_id: number;
  date: Date;
  title: string;
  content: string;
  fingerprint: string;
  tag: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Add other shared types here in the future if needed 