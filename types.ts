export interface Article {
  article_id: number;
  date: Date;
  title: string;
  content: string;
  fingerprint: string;
  tag: string;
}

// Add other shared types here in the future if needed 