// app/compile/page.tsx
import { getGeneratedArticles } from "@/lib/fetchArticles";
import CompilePageClient from "@/components/CompilePageClient";

export default async function CompilePage() {
  const articles = await getGeneratedArticles(); // Supabase query

  return <CompilePageClient cardsData={articles} />;
}
