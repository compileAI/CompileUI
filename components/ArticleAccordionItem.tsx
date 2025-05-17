"use client";

import * as Accordion from "@radix-ui/react-accordion";
import ReactMarkdown from "react-markdown";
import { Article } from "../types";
import ArticleCard from "./ArticleCard";
import { Button } from "@/components/ui/button";
import { MessageCircleMore } from "lucide-react";

interface Props {
  article: Article;
  formattedDate: string;
  lookupLabel: (tag: string) => string;
  onTagClick: (tag: string) => void;
  onOpenChat: () => void;
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
        <div className="w-full transition-shadow duration-200 data-[state=open]:shadow-md data-[state=open]:rounded-b-none">
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
          px-6 pt-2 pb-4
          bg-white dark:bg-zinc-900
          data-[state=open]:animate-slideDown
          data-[state=closed]:animate-slideUp
          rounded-b-xl
        "
      >
        <div className="prose max-w-none">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <div className="border-t pt-4 mt-4 flex justify-end">
          <Button onClick={onOpenChat} className="gap-2">
            <MessageCircleMore className="h-5 w-5" />
            Chat with this article
          </Button>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
