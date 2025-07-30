"use client";
import { getGeneratedArticleClient } from "@/lib/fetchArticlesClient";
import ChatPageClient from "@/components/ChatPageClient";
import { useEnhancedArticle } from "@/context/EnhancedArticleContext";
import { useEffect, useState } from "react";
import { Article } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}

export default function ArticlePage({ params, searchParams }: PageProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [message, setMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const { lastEnhanced } = useEnhancedArticle();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { id: articleId } = await params;
        const { message: searchMessage } = await searchParams;
        
        setMessage(searchMessage);

        const enhanced = lastEnhanced && lastEnhanced.article_id === articleId ? lastEnhanced : null;
        
        // Always fetch the original article to get proper citations
        const originalArticle = await getGeneratedArticleClient(articleId);
        
        if (enhanced && originalArticle) {
          // Use enhanced content but always use original citations
          setArticle({
            ...enhanced,
            citations: originalArticle.citations // Always use citations from the original article
          });
        } else if (originalArticle) {
          setArticle(originalArticle);
        } else if (enhanced) {
          // Fallback to enhanced article if original can't be found
          setArticle(enhanced);
        }
      } catch (error) {
        console.error('Error loading article:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params, searchParams, lastEnhanced]);

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <div className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-card border-r border-border flex-col z-50 animate-pulse">
          <div className="p-4 border-b border-border">
            <div className="h-8 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-24"></div>
          </div>
          <div className="px-4 pt-4 pb-2">
            <div className="h-10 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded-xl"></div>
          </div>
          <div className="flex-1 px-4 py-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-full"></div>
            ))}
          </div>
        </div>
        
        {/* Mobile Header Skeleton */}
        <div className="md:hidden sticky border-b border-border top-0 z-50 bg-card py-3 px-4 animate-pulse">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-20"></div>
                <div className="h-6 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-16"></div>
              </div>
              <div className="h-6 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-8"></div>
            </div>
            <div className="h-10 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded"></div>
          </div>
        </div>
        
        {/* Main Content Skeleton */}
        <div className="md:ml-56 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden max-w-[2000px] mx-auto">
            <div className="w-2/3 h-full overflow-y-auto">
              <div className="p-8 animate-pulse">
                <div className="max-w-4xl">
                  {/* Article Header Skeleton */}
                  <div className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-8 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-3/4 mr-4"></div>
                      <div className="h-8 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-20 shrink-0"></div>
                    </div>
                    <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-32 mb-6"></div>
                    
                    {/* Article Content Skeleton */}
                    <div className="space-y-4">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded ${
                            i % 4 === 3 ? 'w-3/4' : 'w-full'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium text-foreground">Article not found</p>
        </div>
      </div>
    );
  }

  return <ChatPageClient article={article} initialMessage={message} />;
} 