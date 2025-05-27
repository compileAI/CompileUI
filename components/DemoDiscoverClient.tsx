"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DemoHeader from "./DemoHeader";
import { Article } from "@/types";
import * as Accordion from "@radix-ui/react-accordion";
import DemoArticleAccordionItem from "./DemoArticleAccordionItem";

interface Props {
  initialArticles: Article[];
}

export default function DemoDiscoverClient({ initialArticles }: Props) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search");

  useEffect(() => {
    if (searchQuery) {
      const performSearch = async () => {
        try {
          const response = await fetch('/api/vector-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: 20
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          setArticles(data.articles || []);
        } catch (error) {
          console.error('Error performing vector search:', error);
          setArticles([]);
        }
      };

      performSearch();
    }
  }, [searchQuery]);

  return (
    <div className="pb-6">
      <DemoHeader />

      <div className="mt-6 px-2 sm:px-4 lg:px-8">
        {searchQuery && articles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No articles found for your search. Try different keywords or topics.
            </p>
          </div>
        )}

        {articles.length > 0 ? (
          <Accordion.Root type="multiple" className="flex flex-col gap-2">
            {articles.map((item) => {
              const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              return (
                <DemoArticleAccordionItem
                  key={item.article_id}
                  article={item}
                  formattedDate={formattedDate}
                />
              );
            })}
          </Accordion.Root>
        ) : !searchQuery && (
          <p className="text-sm text-muted-foreground">
            No items found.
          </p>
        )}
      </div>
    </div>
  );
} 