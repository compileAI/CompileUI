import { getGeneratedArticle } from "@/lib/fetchArticles";
import ChatPageClient from "@/components/ChatPageClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { message } = await searchParams;
  
  const article = await getGeneratedArticle(id);
  
  if (!article) {
    return notFound();
  }

  return <ChatPageClient article={article} initialMessage={message} />;
} 