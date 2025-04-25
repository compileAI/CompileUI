import { createClientForServer } from "@/utils/supabase/server";
import { Article } from "@/components/CompilePageClient";

export async function getGeneratedArticles() {
  const supabase = await createClientForServer();
  console.log("[Supabase] Fetching articles...");
  const { data, error } = await supabase
    .from("gen_articles")
    .select("*")
    .order("date", { ascending: false });

  console.log("[Supabase] Articles:", data);
  if (error) console.error("[Supabase ERROR]", error);

  // Type the returned data as Article array
  return data as Article[] || [];
}