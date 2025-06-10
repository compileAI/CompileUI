"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "./Header";
import * as Accordion from "@radix-ui/react-accordion";
import { Article } from "../types";
import ArticleAccordionItem from "./ArticleAccordionItem";

interface Props {
  initialArticles: Article[];
}

export default function DiscoverClient({ initialArticles }: Props) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();

  const handleVectorSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setArticles(initialArticles);
      setSearchQuery("");
      return;
    }

    // Prevent duplicate calls
    if (isLoading) {
      console.log('[DiscoverClient] Search already in progress, skipping duplicate call');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[DiscoverClient] Performing vector search for: "${query}"`);
      
      // Perform vector search
      const response = await fetch('/api/vector-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          limit: 20 // Get more results for search page
        }),
      });

      if (!response.ok) {
        throw new Error(`Vector search failed: ${response.statusText}`);
      }

      const data = await response.json();
      const searchResults: Article[] = data.articles || [];
      
      console.log(`[DiscoverClient] Vector search returned ${searchResults.length} articles`);
      setArticles(searchResults);
      
    } catch (error) {
      console.error('Error performing vector search:', error);
      
      // Fallback to simple text filtering if vector search fails
      console.log('[DiscoverClient] Falling back to text filtering');
      const filteredArticles = initialArticles.filter(article =>
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.content.toLowerCase().includes(query.toLowerCase())
      );
      setArticles(filteredArticles);
    } finally {
      setIsLoading(false);
    }
  }, [initialArticles, isLoading]);

  // Handle search query from URL parameters using Next.js useSearchParams
  useEffect(() => {
    const search = searchParams.get('search');
    
    // If there's a search parameter and it's different from current query, perform search
    if (search && search !== searchQuery) {
      console.log(`[DiscoverClient] New search detected: "${search}" (previous: "${searchQuery}")`);
      setSearchQuery(search);
      handleVectorSearch(search);
    } else if (!search && searchQuery) {
      // If no search parameter but we have a current query, reset to initial articles
      console.log('[DiscoverClient] No search parameter, resetting to initial articles');
      setSearchQuery("");
      setArticles(initialArticles);
    }
  }, [searchParams, handleVectorSearch, searchQuery, initialArticles]);

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 pt-6">
        {searchQuery && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Vector search results for: <span className="font-medium">&ldquo;{searchQuery}&rdquo;</span>
            </p>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Searching for relevant articles...</p>
            </div>
          </div>
        ) : (
          <Accordion.Root type="single" collapsible className="space-y-4">
            {articles.map((article) => {
              const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              return (
                <ArticleAccordionItem
                  key={article.article_id}
                  article={article}
                  formattedDate={formattedDate}
                />
              );
            })}
          </Accordion.Root>
        )}

        {articles.length === 0 && !isLoading && (
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