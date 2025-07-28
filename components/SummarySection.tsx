"use client";

import { useState } from "react";
import { HlcArticle } from "@/types";
import ArticleList from "./ArticleList";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SummarySectionProps {
  summary: HlcArticle;
  index?: number;
}

const INITIAL_ARTICLES_COUNT = 2;

// Function to format topic names into readable text
const formatTopicName = (topic: string): string => {
  return topic
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Split on camelCase boundaries
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Split on numbers
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Capitalize each word
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    // Clean up any extra spaces
    .replace(/\s+/g, ' ')
    .trim()
    // Fix common tech acronyms
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bLlm\b/g, 'LLM')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bUi\b/g, 'UI')
    .replace(/\bUx\b/g, 'UX')
    .replace(/\bMl\b/g, 'ML')
    .replace(/\bNlp\b/g, 'NLP')
    .replace(/\bGpt\b/g, 'GPT')
    .replace(/\bCpu\b/g, 'CPU')
    .replace(/\bGpu\b/g, 'GPU')
    .replace(/\bIot\b/g, 'IoT')
    .replace(/\bSql\b/g, 'SQL');
};

export default function SummarySection({ summary, index = 0 }: SummarySectionProps) {
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

  // Alternate background colors for visual separation
  const isEven = index % 2 === 0;
  const sectionBg = isEven ? "bg-background" : "bg-muted/20";

  return (
    <>
      <section 
        className={`min-w-full h-auto lg:h-[calc(100vh-4rem)] flex-shrink-0 px-4 md:px-8 py-6 lg:py-8 mb-8 lg:mb-0 ${sectionBg} relative`}
        aria-label={`Summary: ${summary.title}`}
      >
        <div className="max-w-7xl mx-auto h-full">
          {/* Title with Topic Badge */}
          <div className="mb-4 lg:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground break-words">
                {summary.title}
              </h1>
              <Badge variant="secondary" className="text-xs sm:text-sm font-medium flex-shrink-0">
                {formatTopicName(summary.topic)}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {formatDate(summary.created_at)}
            </p>
          </div>

          {/* Main Content Layout */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 h-auto lg:h-[calc(100vh-20rem)] px-2 sm:px-4 lg:px-8">
            {/* Left Column - Summary Content (50%) */}
            <div className="w-full lg:w-1/2 flex-shrink-0 min-w-0">
              <div className="bg-card border rounded-lg p-4 sm:p-6 lg:p-8 h-auto lg:h-full lg:overflow-y-auto shadow-sm">
                <div className="prose prose-gray dark:prose-invert max-w-none prose-sm sm:prose-base">
                  <div className="whitespace-pre-wrap leading-relaxed break-words">
                    {summary.content}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Articles (50%) */}
            <div className="w-full lg:w-1/2 flex-shrink-0 min-w-0">
              <div className="bg-card border rounded-lg p-4 sm:p-6 lg:p-8 h-auto lg:h-full flex flex-col shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-foreground break-words">
                  Related Articles
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                    ({articles.length})
                  </span>
                </h2>
                
                {articles.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 lg:py-0">
                    <p className="text-muted-foreground text-center text-sm">
                      No articles available for this summary.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Articles List */}
                    <div className={`flex-1 pr-1 pb-3 ${showAllArticles ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                      <ArticleList articles={displayedArticles} />
                    </div>
                    
                    {/* Show More/Less Button */}
                    {hasMoreArticles && (
                      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllArticles(!showAllArticles)}
                          className="w-full justify-center text-xs sm:text-sm"
                        >
                          {showAllArticles ? (
                            <>
                              <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
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

      {/* Visual Separator */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
    </>
  );
} 