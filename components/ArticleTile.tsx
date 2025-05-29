"use client";

import { EnhancedArticle } from "@/types";
import { Calendar, Tag } from "lucide-react";

interface ArticleTileProps {
  article: EnhancedArticle;
  size: "hero" | "medium" | "small";
  onClick?: () => void;
}

export default function ArticleTile({ article, size, onClick }: ArticleTileProps) {
  const sizeClasses = {
    hero: "col-span-12 md:col-span-8 row-span-2",
    medium: "col-span-12 md:col-span-4 row-span-1", 
    small: "col-span-12 md:col-span-4 row-span-1"
  };

  const titleClasses = {
    hero: "text-2xl md:text-3xl font-bold",
    medium: "text-xl font-semibold",
    small: "text-lg font-semibold"
  };

  const contentClasses = {
    hero: "text-base line-clamp-8",
    medium: "text-sm line-clamp-5", 
    small: "text-sm line-clamp-4"
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

  return (
    <article 
      className={`
        ${sizeClasses[size]}
        bg-white dark:bg-zinc-900 
        border border-zinc-200 dark:border-zinc-700 
        rounded-xl p-4 md:p-5 
        shadow-sm hover:shadow-md 
        transition-all duration-200 
        cursor-pointer 
        hover:border-blue-300 dark:hover:border-blue-600
        overflow-hidden
        group
      `}
      onClick={onClick}
    >
      {/* Header with metadata */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Calendar className="h-3 w-3" />
          <span>{formatDate(article.date)}</span>
        </div>
        {article.tag && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded-full">
            <Tag className="h-3 w-3" />
            <span>{article.tag}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className={`${titleClasses[size]} text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
        {article.title}
      </h2>

      {/* Enhanced content */}
      <div className={`${contentClasses[size]} text-zinc-700 dark:text-zinc-300 leading-relaxed`}>
        {article.tuned}
      </div>

      {/* Footer with citations count if available */}
      {article.citations && article.citations.length > 0 && (
        <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {article.citations.length} source{article.citations.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </article>
  );
}