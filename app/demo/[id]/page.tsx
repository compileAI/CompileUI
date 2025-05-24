import { notFound } from "next/navigation";
import ChatPageClient from "@/components/ChatPageClient";
import { getGeneratedArticles } from "@/lib/fetchArticles";

interface PageProps {
  params: { id: string };
}

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  const articles = await getGeneratedArticles();
  const article = articles.find(a => a.article_id === id);

  if (!article) {
    console.log(`Article with ID ${id} not found. Available article IDs: ${articles.map(a => a.article_id).join(', ')}`);
    notFound();
  }

  return <ChatPageClient article={article} />;
}
