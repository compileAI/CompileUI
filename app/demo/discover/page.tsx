import { getGeneratedArticles } from "@/lib/fetchArticles";
import DemoDiscoverClient from "@/components/DemoDiscoverClient";
import { Article } from "@/types";

export default async function DemoDiscover() {
  const articles: Article[] = await getGeneratedArticles();
  
  // Debug logging
  console.log("=== DEBUG: Articles before passing to DemoPageClient ===");
  articles.forEach(article => {
    console.log(`Article ${article.article_id}:`, {
      title: article.title,
      citationsCount: article.citations.length,
      citations: article.citations
    });
  });
        
  return <DemoDiscoverClient initialArticles={articles} />;
}
