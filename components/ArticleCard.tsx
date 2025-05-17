// components/ArticleCard.tsx
"use client";

import React, { forwardRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { Article } from "../types";
import { TabValue } from "../lib/tabUtils";

interface ArticleCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  cardData: Article;
  onTagClick: (tag: string) => void;
  lookupLabel: (tag: TabValue) => string;
  formattedDate: string;
}

const ArticleCard = forwardRef<HTMLDivElement, ArticleCardProps>(
  (
    {
      cardData,
      onTagClick,
      lookupLabel,
      formattedDate,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        {...rest}
        className={`transition-all duration-200 hover:shadow-md hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 ${className ?? ""}`}
        key={cardData.article_id}
      >
        <CardHeader className="space-y-1">
          <div className="flex flex-row text-left">
            <Badge
              variant="secondary"
              onClick={() => onTagClick(cardData.tag)}
              className="cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              {lookupLabel(cardData.tag as TabValue)}
            </Badge>
            <p className="text-sm text-muted-foreground ml-2">
              {formattedDate}
            </p>
          </div>
          <CardTitle className="text-left">
            <ReactMarkdown>{cardData.title}</ReactMarkdown>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }
);

ArticleCard.displayName = "ArticleCard";

export default ArticleCard;
