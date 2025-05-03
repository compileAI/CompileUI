import { getGeneratedArticles } from "@/lib/fetchArticles";
import CompilePageClient from "@/components/CompilePageClient";
import { Article } from "@/components/CompilePageClient";

export default async function Home() {
  const articles: Article[] = await getGeneratedArticles(); // Supabase query
        
  return <CompilePageClient cardsData={articles} />;
}
