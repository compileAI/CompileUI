"use client";

import { useState } from "react";
import { HlcArticle } from "@/types";
import ArticleList from "./ArticleList";
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SummarySectionProps {
  summary: HlcArticle;
  isActive?: boolean;
}

const INITIAL_ARTICLES_COUNT = 5;

export default function SummarySection({ summary, isActive = false }: SummarySectionProps) {
  const [showAllArticles, setShowAllArticles] = useState(false);
  
  const articles = summary.articles || [];
  const hasMoreArticles = articles.length > INITIAL_ARTICLES_COUNT;
  const displayedArticles = showAllArticles ? articles : articles.slice(0, INITIAL_ARTICLES_COUNT);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <section 
      className="min-w-full h-full flex-shrink-0 snap-start px-4 md:px-8 py-6"
      aria-label={`Summary: ${summary.title}`}
    >
      <div className="max-w-7xl mx-auto h-full">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {summary.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {summary.topic} • {formatDate(summary.created_at)}
          </p>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-auto lg:h-[calc(100vh-10rem)]">
          {/* Left Column - Summary Content (60%) */}
          <div className="w-full lg:w-3/5 flex-shrink-0">
            <div className="bg-card border rounded-lg p-4 lg:p-6 h-auto lg:h-full lg:overflow-y-auto">
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {summary.content}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Articles (40%) */}
          <div className="w-full lg:w-2/5 flex-shrink-0">
            <div className="bg-card border rounded-lg p-4 lg:p-6 h-auto lg:h-full flex flex-col">
              <h2 className="text-lg font-semibold mb-4 text-foreground">
                Related Articles
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({articles.length})
                </span>
              </h2>
              
              {articles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-8 lg:py-0">
                  <p className="text-muted-foreground text-center">
                    No articles available for this summary.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Articles List */}
                  <div className="flex-1 lg:overflow-y-auto lg:pr-2 lg:-mr-2">
                    <ArticleList articles={displayedArticles} />
                  </div>
                  
                  {/* Show More/Less Button */}
                  {hasMoreArticles && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllArticles(!showAllArticles)}
                        className="w-full justify-center"
                      >
                        {showAllArticles ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show {articles.length - INITIAL_ARTICLES_COUNT} More
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 