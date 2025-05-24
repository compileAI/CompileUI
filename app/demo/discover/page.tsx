import { getGeneratedArticles } from "@/lib/fetchArticles";
import DemoDiscoverClient from "@/components/DemoDiscoverClient";
import { Article } from "@/types";

export default async function DemoDiscover() {
  const articles: Article[] = await getGeneratedArticles();
        
  return <DemoDiscoverClient initialArticles={articles} />;
}
