"use client";

import { EnhancedArticle } from "@/types";
import { Calendar, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEnhancedArticle } from "@/context/EnhancedArticleContext";

interface ArticleTileProps {
  article: EnhancedArticle;
  size: "hero" | "small";
}

export default function ArticleTile({ article, size }: ArticleTileProps) {
  const router = useRouter();
  const { setLastEnhanced } = useEnhancedArticle();
  
  const sizeClasses = {
    hero: "col-span-12 md:col-span-8 row-span-2",
    small: "col-span-12 md:col-span-4 row-span-1"
  };

  const titleClasses = {
    hero: "text-2xl md:text-3xl font-bold",
    small: "text-lg font-semibold"
  };

  const contentClasses = {
    hero: "text-base line-clamp-8",
    small: "text-sm line-clamp-4"
  };

  // Strip markdown formatting for preview
  const stripMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')     // Remove bold **text**
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '$1') // Remove italic *text* but not ** or single *
      .replace(/`(.*?)`/g, '$1')           // Remove code `text`
      .replace(/#{1,6}\s+/g, '')           // Remove headers # ## ###
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // Remove links [text](url), keep text
      .replace(/^\s*[\*\-\+]\s+/gm, '')    // Remove bullet points * - +
      .replace(/^\s*\d+\.\s+/gm, '')       // Remove numbered lists 1. 2.
      .replace(/\n+/g, ' ')                // Replace multiple newlines with single space
      .replace(/\s+/g, ' ')                // Replace multiple spaces with single space
      .trim();
  };

  const formatDate = (date: Date | string) => {
    try {
      // Handle both Date objects and string dates
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return "Invalid date";
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.warn('Error formatting date:', error, 'Date value:', date);
      return "Invalid date";
    }
  };

  const handleClick = () => {
    setLastEnhanced(article);
    router.push(`/${article.article_id}`);
  };

  // Clean the content for display
  const displayContent = article.tuned ? stripMarkdown(article.tuned) : '';

  return (
    <article
      className={`
        ${sizeClasses[size]}
        bg-card 
        border border-border 
        rounded-xl p-4 md:p-5 
        shadow-sm hover:shadow-md 
        transition-all duration-200 
        cursor-pointer 
        hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20
        overflow-hidden
        group
        flex flex-col
      `}
      onClick={handleClick}
    >
      {/* Header with metadata */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(article.date)}</span>
        </div>
        {article.tag && (
          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Tag className="h-3 w-3" />
            <span>{article.tag}</span>
          </div>
        )}
      </div>
      {/* Title */}
      <h2 className={`${titleClasses[size]} text-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
        {article.title}
      </h2>
      {/* Enhanced content */}
      <div className={`${contentClasses[size]} text-muted-foreground leading-relaxed flex-grow fade-text-out`}>
        {displayContent}
      </div>
      {/* Footer with citations count */}
      <div className={`${size != "hero" ? "mt-1 pt-1" : "mt-3 pt-2"} border-t border-border flex-shrink-0`}>
        <span className="text-xs text-muted-foreground">
          {article.citations?.length || 0} source{(article.citations?.length || 0) !== 1 ? 's' : ''}
        </span>
      </div>
    </article>
  );
}

