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
        border bg-card group
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
        {/* Source count */}
        <div className="text-sm text-muted-foreground">
          {article.citationCount || 0} {(article.citationCount || 0) === 1 ? 'source' : 'sources'}
        </div>
      </div>
    </article>
  );
}
