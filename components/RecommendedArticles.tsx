"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Article } from '@/types';
import { RECOMMENDATIONS_CONFIG } from '@/config/recommendations';

interface RecommendedArticlesProps {
  articles: Article[];
  loading: boolean;
  onArticleClick?: () => void;
  layout?: 'sidebar' | 'bottom';
}

export default function RecommendedArticles({ articles, loading, onArticleClick, layout = 'bottom' }: RecommendedArticlesProps) {
  const router = useRouter();
  const [error, setError] = useState(false);

  const handleArticleClick = (article: Article) => {
    // Call the optional callback (e.g., to close chat)
    onArticleClick?.();
    router.push(`/${article.article_id}`);
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "Invalid date";
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: layout === 'sidebar' ? undefined : 'numeric' // Shorter format for sidebar
      }).format(dateObj);
    } catch (error) {
      setError(true);
      console.warn('Error formatting date:', error, 'Date value:', date);
      return "Invalid date";
    }
  };

  // Don't render anything if there's an error
  if (error) {
    return null;
  }

  return (
    <section 
      role="region" 
      aria-label="Related Articles"
      className={layout === 'sidebar' ? "sticky top-4" : "mt-4 pt-4 border-t border-border"}
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Related Articles</h2>
      
      {loading ? (
        // Loading skeleton
        <div className={layout === 'sidebar' ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
          {Array.from({ length: RECOMMENDATIONS_CONFIG.DEFAULT_COUNT }).map((_, index) => (
            <div
              key={index}
              data-testid="article-skeleton"
              className={`animate-pulse bg-muted rounded-lg p-4 w-full min-h-[90px] flex flex-col justify-center ${
                layout === 'bottom' ? 'h-32' : ''
              }`}
            >
              <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded mb-2 w-full"></div>
              <div className="h-3 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        // Empty state
        <div className="text-center py-4 text-muted-foreground text-sm">
          <p>No recommendations found</p>
        </div>
      ) : (
        // Articles list
        <div className={layout === 'sidebar' ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
          {articles.map((article) => (
            <article
              key={article.article_id}
              role="button"
              tabIndex={0}
              onClick={() => handleArticleClick(article)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleArticleClick(article);
                }
              }}
              className={`
                w-full cursor-pointer transition-all duration-200 
                hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg
                p-4 border bg-card
                group
                ${layout === 'bottom' ? 'h-32' : ''}
              `}
            >
              <h3 className={`text-sm font-medium leading-tight text-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                layout === 'sidebar' ? 'line-clamp-2' : 'line-clamp-3'
              }`}>
                {article.title}
              </h3>
              <div className="text-xs text-muted-foreground">
                {formatDate(article.date)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
} 