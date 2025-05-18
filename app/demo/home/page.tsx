import { getGeneratedArticles } from "@/lib/fetchArticles";
import DemoPageClient from "@/components/DemoPageClient";
import { Article } from "@/types";

export default async function DemoHome() {
  const articles: Article[] = await getGeneratedArticles();
        
  return <DemoPageClient cardsData={articles} />;
}
