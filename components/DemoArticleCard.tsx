"use client";

import React, { forwardRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Article } from "../types";

interface DemoArticleCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  cardData: Article;
  formattedDate: string;
}

const DemoArticleCard = forwardRef<HTMLDivElement, DemoArticleCardProps>(
  (
    {
      cardData,
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
        className={`py-4 px-6 transition-all duration-200 hover:shadow-md hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 ${className ?? ""}`}
        key={cardData.article_id}
      >
        <CardHeader className="grid grid-rows-[auto] items-center gap-0 px-0 py-1">
        <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground w-28 flex-shrink-0 m-0 leading-snug">
            {formattedDate}
            </p>
            <CardTitle className="text-left flex-1 leading-snug m-0">
            {cardData.title}
            </CardTitle>
        </div>
        </CardHeader>
      </Card>
    );
  }
);

DemoArticleCard.displayName = "DemoArticleCard";

export default DemoArticleCard; 