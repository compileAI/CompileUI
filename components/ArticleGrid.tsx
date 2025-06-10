"use client";

import { useHomeSearch } from "@/hooks/useHomeSearch";
import { usePreferences } from "@/hooks/usePreferences";
import ArticleTile from "./ArticleTile";
import ArticleModal from "./ArticleModal";
import { useEffect, useRef, useState } from "react";
import { EnhancedArticle } from "@/types";

export default function ArticleGrid() {
  const { loading, articles, error, search } = useHomeSearch();
  const { getContentInterests, getPresentationStyle, isLoaded } = usePreferences();
  const hasSearched = useRef(false);
  const [selectedArticle, setSelectedArticle] = useState<EnhancedArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-search when preferences are loaded (only once)
  useEffect(() => {
    if (isLoaded && !hasSearched.current) {
      const contentInterests = getContentInterests();
      const presentationStyle = getPresentationStyle();
      console.log(`[ArticleGrid] Auto-searching with content interests: "${contentInterests}" and presentation style: "${presentationStyle}"`);
      search(contentInterests, presentationStyle);
      hasSearched.current = true;
    }
  }, [isLoaded, search, getContentInterests, getPresentationStyle]);

  const handleReadAndChat = (article: EnhancedArticle) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  const getSizeForIndex = (index: number): "hero" | "medium" | "small" => {
    if (index === 0) return "hero";
    if (index <= 2) return "medium";
    return "small";
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2">
        {/* Error State */}
        {error && (
          <div className="text-center py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 auto-rows-auto sm:auto-rows-[200px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`
                  ${i === 0 ? "col-span-12 md:col-span-8 row-span-2" : "col-span-12 md:col-span-4 row-span-1"}
                  bg-muted/50
                  rounded-xl 
                  animate-pulse
                  p-4 md:p-5
                `}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="h-3 bg-muted rounded w-20"></div>
                  <div className="h-5 bg-muted rounded w-16"></div>
                </div>
                <div className={`h-6 bg-muted rounded mb-3 ${i === 0 ? "w-3/4" : "w-full"}`}></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  {i === 0 && (
                    <>
                      <div className="h-4 bg-muted rounded w-4/5"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-4/5"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </>
                  )}
                  {i !== 0 && (
                    <>
                      <div className="h-4 bg-muted rounded w-4/5"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-4/5"></div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && articles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 auto-rows-auto sm:auto-rows-[200px]">
            {articles.map((article, index) => (
              <ArticleTile
                key={article.article_id}
                article={article}
                size={getSizeForIndex(index)}
                onReadAndChat={() => handleReadAndChat(article)}
              />
            ))}
          </div>
        )}

        {/* Empty State (when search returns no results) */}
        {!loading && !error && articles.length === 0 && isLoaded && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No recent articles found
              </h3>
              <p className="text-muted-foreground">
                We couldn&apos;t find any articles from today or yesterday matching your preferences. Try updating your preferences or check back later for new content.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Article Modal */}
      <ArticleModal
        article={selectedArticle}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}