"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "./Header";
import ArticleList from "./ArticleList";
import { useDiscoverArticles } from "@/hooks/useDiscoverArticles";
import { Button } from "./ui/button";

export default function DiscoverClient() {
  const { 
    articles, 
    loading, 
    error, 
    hasMore, 
    fetchArticles, 
    loadMore, 
    search,
    refresh,
    searchQuery 
  } = useDiscoverArticles();
  const searchParams = useSearchParams();

  // Handle initial load and search query from URL parameters
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    
    if (urlSearchQuery) {
      // Search with query from URL (ignore timestamp parameter)
      search(urlSearchQuery);
    } else {
      // Load all articles
      fetchArticles();
    }
  }, [searchParams, search, fetchArticles]);

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 pt-6">
        {searchQuery && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Search results for: <span className="font-medium">&ldquo;{searchQuery}&rdquo;</span>
            </p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={refresh} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {loading && articles.length === 0 && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>{searchQuery ? 'Searching for relevant articles...' : 'Loading articles...'}</p>
            </div>
          </div>
        )}

        {/* Articles List */}
        {!error && articles.length > 0 && (
          <>
            <ArticleList articles={articles} />
            
            {/* Load More / Loading More */}
            {hasMore && (
              <div className="text-center py-8">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading more articles...</p>
                  </div>
                ) : (
                  <Button onClick={loadMore} variant="outline">
                    Load More Articles
                  </Button>
                )}
              </div>
            )}

            {/* End of Results */}
            {!hasMore && articles.length > 20 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  You&apos;ve reached the end of the results.
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!error && !loading && articles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {searchQuery ? 'No relevant articles found for your search.' : 'No articles available.'}
            </p>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2">
                Try different keywords or check back later for new content.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
} 