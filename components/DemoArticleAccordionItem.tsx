"use client";

import * as Accordion from "@radix-ui/react-accordion";
import ReactMarkdown from "react-markdown";
import { Article } from "../types";
import DemoArticleCard from "./DemoArticleCard";
import { Button } from "@/components/ui/button";
import { MessageCircleMore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  article: Article;
  formattedDate: string;
}

export default function DemoArticleAccordionItem({
  article,
  formattedDate,
}: Props) {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");

  const handleChatClick = () => {
    router.push(`/demo/${article.article_id}`);
  };

  return (
    <Accordion.Item
      value={String(article.article_id)}
      className="overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 will-change-[height]
      transition-shadow hover:shadow-sm"
    >
      <Accordion.Trigger asChild>
        <div className="
            w-full cursor-pointer transition-shadow duration-200 
            data-[state=open]:shadow-md data-[state=open]:rounded-b-none 
            hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-t-xl
        ">
          <DemoArticleCard
            cardData={article}
            formattedDate={formattedDate}
            className="border-none rounded-none"
          />
        </div>
      </Accordion.Trigger>

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

        <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 mt-6 mb-2">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
            />
            <Button onClick={handleChatClick} className="gap-2">
              <MessageCircleMore className="h-5 w-5" />
              Chat
            </Button>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
} 