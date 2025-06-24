"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Article } from '@/types';
import { getRecentlyVisited, addRecentlyVisited } from '@/utils/recentlyVisited';
import { RECOMMENDATIONS_CONFIG } from '@/config/recommendations';

interface RecommendedArticlesProps {
  currentArticleId: string;
  onArticleClick?: () => void;
}

export default function RecommendedArticles({ currentArticleId, onArticleClick }: RecommendedArticlesProps) {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const excludeIds = getRecentlyVisited();
        
        const response = await fetch('/api/recommended-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: currentArticleId,
            excludeIds,
            limit: RECOMMENDATIONS_CONFIG.DEFAULT_COUNT
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setArticles(data.articles || []);
      } catch (error) {
        console.error('Error fetching recommended articles:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (currentArticleId) {
      fetchRecommendations();
    }
  }, [currentArticleId]);

  const handleArticleClick = (article: Article) => {
    // Add current article to recently visited before navigating
    addRecentlyVisited(currentArticleId);
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
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
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
      aria-label="Recommended Articles"
      className="mt-8 pt-8 border-t border-border"
    >
      <h2 className="text-xl font-semibold mb-6">Recommended Articles</h2>
      
      {loading ? (
        // Loading skeleton
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: RECOMMENDATIONS_CONFIG.LOADING_SKELETON_COUNT }).map((_, index) => (
            <div
              key={index}
              data-testid="article-skeleton"
              className="animate-pulse bg-muted rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        // Empty state
        <div className="text-center py-6 text-muted-foreground">
          <p>No recommendations found</p>
        </div>
      ) : (
        // Articles list
        <div className="grid grid-cols-1 gap-4">
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
              className="
                w-full cursor-pointer transition-all duration-200 
                hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-500 rounded-xl
                p-6 flex items-center justify-between
                border bg-white dark:bg-zinc-900
                group
              "
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold leading-tight text-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {article.title}
                </h3>
                <div className="text-sm text-muted-foreground">
                  {formatDate(article.date)}
                </div>
              </div>
              
              <div className="flex items-center gap-3 ml-4">
                {/* Source count */}
                <div className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {article.citations?.length || 0} {(article.citations?.length || 0) === 1 ? 'source' : 'sources'}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
} 