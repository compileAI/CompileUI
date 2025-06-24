// components/ArticleCard.tsx
"use client";

import { Article } from "../types";
import { useRouter } from "next/navigation";

interface Props {
  article: Article;
  formattedDate: string;
}

export default function ArticleCard({ article, formattedDate }: Props) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/${article.article_id}`);
  };

  return (
    <article
      onClick={handleClick}
      className="
        w-full cursor-pointer transition-all duration-200 
        hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-500 
        hover:shadow-md rounded-xl p-6 flex items-center justify-between
        border bg-white dark:bg-zinc-900 group
      "
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold leading-tight text-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {article.title}
        </h3>
        <div className="text-sm text-muted-foreground">
          {formattedDate}
        </div>
      </div>
      
      <div className="flex items-center gap-3 ml-4">
        {/* Source count with hover tooltip */}
        <div className="group/sources relative">
          <div className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-help">
            {article.citations?.length || 0} {(article.citations?.length || 0) === 1 ? 'source' : 'sources'}
          </div>
          {/* Tooltip on hover - shows list of source titles */}
          <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-black text-white text-xs rounded-md opacity-0 group-hover/sources:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs shadow-lg">
            {article.citations && article.citations.length > 0 ? (
              <div className="space-y-1">
                {article.citations.map((citation, index) => (
                  <div key={index} className="text-left">
                    {citation.sourceName}
                  </div>
                ))}
              </div>
            ) : (
              <div>No sources available</div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
