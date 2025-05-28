import { notFound } from "next/navigation";
import ChatPageClient from "@/components/ChatPageClient";
import { getGeneratedArticle } from "@/lib/fetchArticles";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}

export default async function ChatPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { message } = await searchParams;
  
  if (!id) {
    notFound();
  }

  const article = await getGeneratedArticle(id);

  if (!article) {
    console.log(`Article with ID ${id} not found`);
    notFound();
  }

  return <ChatPageClient article={article} initialMessage={message} />;
}
