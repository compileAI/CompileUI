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
  const { lastEnhanced } = useEnhancedArticle();

  useEffect(() => {
    const loadData = async () => {
      const { id: articleId } = await params;
      const { message: searchMessage } = await searchParams;
      
      setMessage(searchMessage);

      const enhanced = lastEnhanced && lastEnhanced.article_id === articleId ? lastEnhanced : null;
      
      if (enhanced) {
        setArticle(enhanced);
      } else {
        const fetchedArticle = await getGeneratedArticleClient(articleId);
        if (fetchedArticle) {
          setArticle(fetchedArticle);
        }
      }
    };

    loadData();
  }, [params, searchParams, lastEnhanced]);

  if (!article) {
    return <div>Loading...</div>;
  }

  return <ChatPageClient article={article} initialMessage={message} />;
} 