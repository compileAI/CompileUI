import { createClientForServer } from "@/utils/supabase/server";
import { Article } from "@/types";

export async function getGeneratedArticles() {
  const supabase = await createClientForServer();
  console.log("[Supabase] Fetching articles...");

  // Calculate date 7 days ago in ISO format (since that's what we use in Supabase)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoISO = oneWeekAgo.toISOString();

  const { data, error } = await supabase
    .from("gen_articles")
    .select("*")
    .gte("date", oneWeekAgoISO)  // only articles from the last 7 days
    .order("date", { ascending: false });

  if (error) console.error("[Supabase ERROR]", error);

  // Type the returned data as Article array
  return data as Article[] || [];
}