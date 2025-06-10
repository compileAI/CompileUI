// components/ArticleCard.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Article } from "../types";
import { forwardRef } from "react";
import {
  ChevronDown
} from "lucide-react";

interface ArticleCardProps {
  cardData: Article;
  formattedDate: string;
  className?: string;
}

const ArticleCard = forwardRef<HTMLDivElement, ArticleCardProps>(
  ({ cardData, formattedDate, className = "" }, ref) => {
    // Strip markdown formatting for preview
    const stripMarkdown = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/`(.*?)`/g, '$1')       // Remove code
        .replace(/#{1,6}\s/g, '')        // Remove headers
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
        .replace(/\n/g, ' ')             // Replace newlines with spaces
        .trim();
    };

    const cleanContent = stripMarkdown(cardData.content);
    const truncatedContent = cleanContent.slice(0, 200) + (cleanContent.length > 200 ? "..." : "");

    return (
      <Card
        ref={ref}
        className={`p-6 hover:bg-accent/10 transition-colors duration-200 cursor-pointer border border-border relative ${className}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold leading-tight text-foreground">
                  {cardData.title}
                </h3>
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
              
              <div className="text-sm text-muted-foreground">
                {formattedDate}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {truncatedContent}
              </p>

              {/* Citations section */}
              {cardData.citations && cardData.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">
                    Sources ({cardData.citations.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cardData.citations.slice(0, 3).map((citation, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-accent/20 text-xs rounded-md text-muted-foreground border border-accent/30"
                      >
                        {citation.sourceName}
                      </span>
                    ))}
                    {cardData.citations.length > 3 && (
                      <span className="inline-block px-2 py-1 bg-accent/20 text-xs rounded-md text-muted-foreground border border-accent/30">
                        +{cardData.citations.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }
);

ArticleCard.displayName = "ArticleCard";

export default ArticleCard;
