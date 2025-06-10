import DiscoverClient from "@/components/DiscoverClient";
import { getGeneratedArticles } from "@/lib/fetchArticles";

export default async function Discover() {
  const articles = await getGeneratedArticles(); // Supabase query
  // console.log("=== DEBUG: Articles data ===", articles.slice(0, 2));
  // console.log("=== DEBUG: Articles before passing to PageClient ===");
  // console.log("Total articles fetched:", articles.length);
  // console.log("First article ID:", articles[0]?.article_id);
  // console.log("First article title:", articles[0]?.title);
  // console.log("First article citations count:", articles[0]?.citations?.length);
  // console.log("First article citations:", articles[0]?.citations);
  // console.log("=== END DEBUG ===");

  return <DiscoverClient initialArticles={articles} />;
} 