"use client";

import * as Accordion from "@radix-ui/react-accordion";
import ReactMarkdown from "react-markdown";
import { Article } from "../types";
import ArticleCard from "./ArticleCard";
import { Button } from "@/components/ui/button";
import { MessageCircleMore } from "lucide-react";

interface Citation {
  sourceName: string;
  articleTitle: string;
  url: string;
}

interface Props {
  article: Article;
  formattedDate: string;
  lookupLabel: (tag: string) => string;
  onTagClick: (tag: string) => void;
  onOpenChat: () => void;
  citations?: Citation[];
}

export default function ArticleAccordionItem({
  article,
  formattedDate,
  lookupLabel,
  onTagClick,
  onOpenChat,
}: Props) {
  return (
    <Accordion.Item
      /* the outer shell supplies the single rounded border */
      value={String(article.article_id)}
      className="overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 will-change-[height]
      transition-shadow hover:shadow-sm"
    >
      {/* TRIGGER ───────────────────────────────────────────── */}
      <Accordion.Trigger asChild>
        {/* this div itself receives data-state="open | closed" */}
        <div className="
            w-full cursor-pointer transition-shadow duration-200 
            data-[state=open]:shadow-md data-[state=open]:rounded-b-none 
            hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-t-xl
        ">
        <ArticleCard
            cardData={article}
            formattedDate={formattedDate}
            onTagClick={onTagClick}
            lookupLabel={lookupLabel}
            /* we let the Item supply the border/radius instead */
            className="border-none rounded-none"
          />
        </div>
      </Accordion.Trigger>

      {/* CONTENT ────────────────────────────────────────────── */}
      <Accordion.Content
        className="
          px-6 pt-0 pb-2
          bg-white dark:bg-zinc-900
          data-[state=open]:animate-slideDown
          data-[state=closed]:animate-slideUp
          rounded-b-xl
        "
      >
        <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 mt-6 mb-2 flex justify-end">
        <Button onClick={onOpenChat} className="gap-2">
            <MessageCircleMore className="h-5 w-5" />
            Chat
        </Button>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
