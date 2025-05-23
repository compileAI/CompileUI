import { getGeneratedArticles } from "@/lib/fetchArticles";
import DemoPageClient from "@/components/DemoPageClient";
import { Article } from "@/types";

export default async function DemoDiscover() {
  const articles: Article[] = await getGeneratedArticles();
        
  return <DemoPageClient cardsData={articles} />;
}
