import { createClientForServer } from "@/utils/supabase/server";
import { Article } from "@/types"; // Ensure Article type still has article_id: string

export async function getGeneratedArticles(): Promise<Article[]> {
  const supabase = await createClientForServer();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoISO = oneWeekAgo.toISOString();

  const { data, error } = await supabase
    .from("gen_articles")
    .select("article_id::text, date, title, content, fingerprint, tag") // Cast article_id to text to avoid integer precision issues.
    .gte("date", oneWeekAgoISO)
    .order("date", { ascending: false });

  if (error) {
    console.error("[Supabase ERROR in getGeneratedArticles]", error);
    return [];
  }

  if (!data) {
    console.log("[Supabase getGeneratedArticles] No data returned from query.");
    return [];
  }

  const typedArticles: Article[] = data.map(item => {
    // We need to cast the article_id to a string to avoid integer precision issues.
    return {
      ...item,
      article_id: String(item.article_id),
      date: new Date(item.date),
      title: String(item.title),
      content: String(item.content),
      fingerprint: String(item.fingerprint),
      tag: String(item.tag),
    };
  });

  return typedArticles;
}
