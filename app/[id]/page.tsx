"use client";
import { getGeneratedArticleClient } from "@/lib/fetchArticlesClient";
import ChatPageClient from "@/components/ChatPageClient";
import { useEnhancedArticle } from "@/context/EnhancedArticleContext";
import { useEffect, useState } from "react";
import { Article } from "@/types";
import { Loader2 } from "lucide-react";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">Loading article...</p>
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