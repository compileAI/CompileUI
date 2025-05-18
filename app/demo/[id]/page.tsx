import { notFound } from "next/navigation";
import ChatPageClient from "../../../components/ChatPageClient";
import { getGeneratedArticles } from "@/lib/fetchArticles";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ChatPage({ params }: PageProps) {
  if (!params.id) {
    notFound();
  }

  const articles = await getGeneratedArticles();
  const article = articles.find(a => a.article_id === parseInt(params.id));

  if (!article) {
    notFound();
  }

  return <ChatPageClient article={article} />;
} 