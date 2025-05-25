import { notFound } from "next/navigation";
import ChatPageClient from "@/components/ChatPageClient";
import { getGeneratedArticle } from "@/lib/fetchArticles";

interface PageProps {
  params: { id: string };
  searchParams: { message?: string };
}

export default async function ChatPage({ params, searchParams }: PageProps) {
  const { id } = params;
  const { message } = searchParams;
  
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
