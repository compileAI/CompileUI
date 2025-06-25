"use client";

import { useHomeSearch } from "@/hooks/useHomeSearch";
import { usePreferences } from "@/hooks/usePreferences";
import { usePreloadDiscover } from "@/hooks/usePreloadDiscover";
import ArticleTile from "./ArticleTile";
import { useEffect, useRef } from "react";
import { Settings } from "lucide-react";

export default function ArticleGrid() {
  const { loading, articles, error, search } = useHomeSearch();
  const { getContentInterests, getPresentationStyle, isLoaded } = usePreferences();
  const { triggerPreload } = usePreloadDiscover();
  const hasSearched = useRef(false);
  const hasTriggeredPreload = useRef(false);

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

  // Trigger discover preload when home page finishes loading
  useEffect(() => {
    if (!loading && articles.length > 0 && !hasTriggeredPreload.current) {
      console.log('[ArticleGrid] Home page loaded successfully, triggering discover preload');
      triggerPreload(3000); // Wait 3 seconds after home page loads
      hasTriggeredPreload.current = true;
    }
  }, [loading, articles.length, triggerPreload]);

  const getSizeForIndex = (index: number): "hero" | "medium" | "small" => {
    if (index === 0) return "hero";
    if (index <= 2) return "medium";
    return "small";
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Loading Message */}
      {loading && (
        <div className="text-center py-8 mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            Fetching your custom feed!
          </h2>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            Update your preferences with the 
            <span className="inline-flex items-center justify-center p-2 bg-muted/50 rounded-md border border-border">
              <Settings className="h-4 w-4" />
            </span>
            button in the top right corner
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Grid Container - same position for both skeleton and article grid */}
      <div className={loading ? "" : "animate-in slide-in-from-bottom-4 duration-500 ease-out"}>
        {/* Loading Skeleton Grid */}
        {loading && (
          <div className="grid grid-cols-12 gap-3 auto-rows-[25vh]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`
                  ${i === 0 ? "col-span-12 md:col-span-8 row-span-2" : "col-span-12 md:col-span-4 row-span-1"}
                  bg-muted
                  rounded-xl 
                  animate-pulse
                  p-4 md:p-5
                `}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </div>
                <div className={`h-6 bg-gray-200 rounded mb-3 ${i === 0 ? "w-3/4" : "w-full"}`}></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  {i === 0 && (
                    <>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    </>
                  )}
                  {i !== 0 && (
                    <>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && articles.length > 0 && (
          <div className="grid grid-cols-12 gap-3 auto-rows-[25vh]">
            {articles.map((article, index) => (
              <ArticleTile
                key={article.article_id}
                article={article}
                size={getSizeForIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Empty State (when search returns no results) */}
      {!loading && !error && articles.length === 0 && isLoaded && hasSearched.current && (
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
  );
}