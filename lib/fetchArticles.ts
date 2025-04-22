import { createClientForServer } from "@/utils/supabase/server";

export async function getGeneratedArticles() {
  const supabase = await createClientForServer();

  const { data, error } = await supabase
    .from("generated_articles")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("[Supabase] Articles:", data);
  if (error) console.error("[Supabase ERROR]", error);

  return data;
}