"use client";

import { useHomeSearch } from "@/hooks/useHomeSearch";
import { usePreferences } from "@/hooks/usePreferences";
import { usePreloadDiscover } from "@/hooks/usePreloadDiscover";
import ArticleTile from "./ArticleTile";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ArticleGrid() {
  const [isMobile, setIsMobile] = useState(false);
  const { loading, articles, error, search } = useHomeSearch();
  const { getContentInterests, getPresentationStyle, isLoaded, user } = usePreferences();
  const { triggerPreload } = usePreloadDiscover();
  const hasSearched = useRef(false);
  const hasTriggeredPreload = useRef(false);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-search when preferences are loaded and user auth state is established
  useEffect(() => {
    async function initializeArticles() {
      if (isLoaded && !hasSearched.current) {
        // Wait for user authentication state to be established
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        console.log(`[ArticleGrid] Auth check - isLoaded: ${isLoaded}, authUser: ${authUser ? 'authenticated' : 'not authenticated'}`);

        if (authUser) {
          // For authenticated users, check if they have saved preferences
          const contentInterests = getContentInterests();
          const presentationStyle = getPresentationStyle();
          
          console.log(`[ArticleGrid] User preferences - contentInterests: "${contentInterests}", presentationStyle: "${presentationStyle}"`);
          
          // If user has saved preferences, use them
          if (contentInterests && presentationStyle && contentInterests.trim() && presentationStyle.trim()) {
            console.log(`[ArticleGrid] Auto-searching with saved preferences: "${contentInterests}" and "${presentationStyle}"`);
            search(contentInterests, presentationStyle);
            hasSearched.current = true;
          } else {
            // User has no saved preferences - get general articles
            console.log('[ArticleGrid] Authenticated user has no saved preferences, fetching general articles');
            search('', '');
            hasSearched.current = true;
          }
        } else {
          // For unauthenticated users, just fetch articles (server will handle defaults)
          console.log('[ArticleGrid] Unauthenticated user, fetching general articles');
          search('', '');
          hasSearched.current = true;
        }
      }
    }

    // Add a small delay to ensure auth state is properly established
    const timer = setTimeout(initializeArticles, 100);
    return () => clearTimeout(timer);
  }, [isLoaded, user, search, getContentInterests, getPresentationStyle]);

  // Listen for preference change events (only when user explicitly changes preferences)
  useEffect(() => {
    async function handlePreferenceChange() {
      // Only refresh if we've already done the initial search
      if (hasSearched.current && isLoaded && user) {
        console.log('[ArticleGrid] Preferences changed by user, refreshing articles');
        
        const contentInterests = getContentInterests();
        const presentationStyle = getPresentationStyle();
        
        console.log(`[ArticleGrid] Refreshing with preferences - contentInterests: "${contentInterests}", presentationStyle: "${presentationStyle}"`);
        
        // If user has saved preferences, use them
        if (contentInterests && presentationStyle && contentInterests.trim() && presentationStyle.trim()) {
          console.log(`[ArticleGrid] Refreshing with saved preferences: "${contentInterests}" and "${presentationStyle}"`);
          search(contentInterests, presentationStyle);
        } else {
          // User has no saved preferences - get general articles
          console.log('[ArticleGrid] User has no saved preferences, refreshing with general articles');
          search('', '');
        }
      }
    }

    // Listen for preference change events (not all cache updates)
    window.addEventListener('preferencesChanged', handlePreferenceChange);
    
    return () => {
      window.removeEventListener('preferencesChanged', handlePreferenceChange);
    };
  }, [isLoaded, user, search, getContentInterests, getPresentationStyle]);

  // Trigger discover preload when home page finishes loading
  useEffect(() => {
    if (!loading && articles.length > 0 && !hasTriggeredPreload.current) {
      console.log('[ArticleGrid] Home page loaded successfully, triggering discover preload');
      triggerPreload(3000); // Wait 3 seconds after home page loads
      hasTriggeredPreload.current = true;
    }
  }, [loading, articles.length, triggerPreload]);

  const getSizeForIndex = (index: number): "hero" | "small" => {
    if (index === 0 || isMobile) return "hero";
    return "small";
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
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
                  ${getSizeForIndex(i) === "hero" ? "col-span-12 md:col-span-8 row-span-2" : "col-span-12 md:col-span-4 row-span-1"}
                  bg-muted
                  rounded-xl 
                  animate-pulse
                  p-4 md:p-5
                `}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="h-3 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-20"></div>
                  <div className="h-5 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-16"></div>
                </div>
                <div className={`h-6 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded mb-3 ${i === 0 ? "w-3/4" : "w-full"}`}></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded"></div>
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-5/6"></div>
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-4/5"></div>
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-3/4"></div>
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
                size={isMobile ? "hero" : getSizeForIndex(index)}
              />
            ))}
            {/* ^^ if mobile, use hero size, because its easiest to read, otherwise use the size for the index */}

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
              We couldn&apos;t find any articles from today or yesterday. Please check back later for new content.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}