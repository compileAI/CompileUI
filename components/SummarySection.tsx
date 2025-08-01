"use client";

import { useState, useRef } from "react";
import { HlcArticle, Article } from "@/types";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import ArticleCard from "./ArticleCard";

interface SummarySectionProps {
  summary: HlcArticle;
  index?: number;
}

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
    .replace(/\bLlms\b/g, 'LLMs')
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

// Featured article component
function FeaturedArticle({ article }: { article?: Article }) {
  if (!article) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm">
          No featured article available.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-1 sm:space-y-3">
      <h2 className="text-base sm:text-lg font-semibold text-foreground">Featured Article</h2>
      <div>
        <ArticleCard article={article} formattedDate={formattedDate} />
      </div>
    </div>
  );
}

// Article carousel component
function ArticleCarousel({ articles }: { articles: Article[] }) {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(articles.length > 3);

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid date";
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(dateObj);
    } catch {
      return "Invalid date";
    }
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const scrollAmount = 320; // Width of a card plus gap
    const newScrollLeft = direction === 'left' 
      ? carouselRef.current.scrollLeft - scrollAmount
      : carouselRef.current.scrollLeft + scrollAmount;
    
    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleArticleClick = (article: Article) => {
    router.push(`/${article.article_id}`);
  };

  if (articles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">
          No articles available for this summary.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-5">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          All Articles
          <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
            ({articles.length})
          </span>
        </h2>
        
        {/* Navigation buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-background/60 hover:bg-background border border-border/50"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-background/60 hover:bg-background border border-border/50"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Carousel */}
      <div 
        ref={carouselRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory touch-pan-x"
        onScroll={handleScroll}
      >
        {articles.map((article) => (
          <article
            key={article.article_id}
            className="
              flex-none w-64 sm:w-72 md:w-72 lg:w-80
              bg-card border border-border rounded-xl p-4 sm:p-5 
              shadow-sm hover:shadow-md transition-shadow duration-200 
              cursor-pointer hover:border-blue-500/50
              snap-start group min-h-[120px] sm:min-h-[140px] flex flex-col justify-between
            "
            onClick={() => handleArticleClick(article)}
          >
            {/* Title */}
            <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
              {article.title}
            </h3>
            
            {/* Metadata - Date and Source Count */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
              <div className="flex items-center gap-1 sm:gap-2">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">{formatDate(article.date)}</span>
              </div>
              <span className="font-medium text-xs">
                {article.citations?.length || 0} source{(article.citations?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function SummarySection({ summary }: SummarySectionProps) {
  const articles = summary.articles || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <section 
        className={`min-w-full min-h-screen flex-shrink-0 px-4 sm:px-4 md:px-8 py-6 sm:py-4 lg:py-12 mb-0 bg-background relative`}
        aria-label={`Summary: ${summary.title}`}
      >
        <div className="max-w-6xl mx-auto min-h-full flex flex-col lg:justify-center">
          {/* Title and Date */}
          <div className="space-y-1 mb-6 sm:mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              {formatTopicName(summary.topic)}
            </h1>
            <p className="text-sm sm:text-sm text-muted-foreground">
              {formatDate(summary.created_at)}
            </p>
          </div>

          {/* Summary Content - Full Width with Blockquote Style */}
          <div className="border-l-4 border-foreground/20 pl-4 sm:pl-6 pr-2 sm:pr-4 mb-4 sm:mb-8 lg:mb-10">
            <div className="prose prose-gray dark:prose-invert max-w-none prose-sm sm:prose-base lg:prose-lg">
              <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {summary.content}
              </div>
            </div>
          </div>

          {/* Featured Article - Most recent article in the topic */}
          <div className="mb-4 sm:mb-8 lg:flex-1 pt-1 sm:pt-4">
            <FeaturedArticle article={articles[0]} />
          </div>

          {/* All Articles Carousel - Better spacing for mobile */}
          <div className="lg:mt-auto pt-1 sm:pt-4 pb-4 lg:pb-0">
            <ArticleCarousel articles={articles} />
          </div>
        </div>
      </section>

      {/* Visual Separator */}
      <div className="w-full h-px from-transparent border"></div>
    </>
  );
} 