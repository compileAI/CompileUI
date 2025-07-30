import { Article } from "../types";
import ArticleCard from "./ArticleCard";

interface Props {
  articles: Article[];
}

export default function ArticleList({ articles }: Props) {
  return (
    <div className="space-y-2">
      {articles.map((article) => {
        const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return (
          <ArticleCard
            key={article.article_id}
            article={article}
            formattedDate={formattedDate}
          />
        );
      })}
    </div>
  );
} 