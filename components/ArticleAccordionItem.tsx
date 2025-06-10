"use client";

import * as Accordion from "@radix-ui/react-accordion";
import ReactMarkdown from "react-markdown";
import { Article } from "../types";
import { Button } from "@/components/ui/button";
import { MessageCircleMore, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  article: Article;
  formattedDate: string;
}

export default function ArticleAccordionItem({
  article,
  formattedDate,
}: Props) {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");

  const handleDoubleClick = () => {
    router.push(`/${article.article_id}`);
  };

  const handleChatClick = () => {
    if (!chatInput.trim()) {
      router.push(`/${article.article_id}`);
      return;
    }
    
    const encodedMessage = encodeURIComponent(chatInput.trim());
    router.push(`/${article.article_id}?message=${encodedMessage}`);
  };

  return (
    <Accordion.Item
      value={String(article.article_id)}
      className="overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 will-change-[height] transition-shadow hover:shadow-sm"
    >
      <Accordion.Trigger asChild>
        <div 
          className="
            w-full cursor-pointer transition-all duration-200 
            data-[state=open]:shadow-md data-[state=open]:rounded-b-none 
            hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-500 rounded-t-xl
            p-6 flex items-center justify-between
            group
          "
          onDoubleClick={handleDoubleClick}
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold leading-tight text-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {article.title}
            </h3>
            <div className="text-sm text-muted-foreground">
              {formattedDate}
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            {/* Source count with hover tooltip */}
            <div className="group/sources relative">
              <div className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-help">
                {article.citations?.length || 0} sources
              </div>
              {/* Tooltip on hover */}
              <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-black text-white text-xs rounded-md opacity-0 group-hover/sources:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {article.citations?.length || 0} source{(article.citations?.length || 0) !== 1 ? 's' : ''} cited
              </div>
            </div>
            
            {/* Chevron icon */}
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </div>
      </Accordion.Trigger>

      <Accordion.Content
        className="
          px-6 pb-2
          bg-white dark:bg-zinc-900
          data-[state=open]:animate-slideDown
          data-[state=closed]:animate-slideUp
          rounded-b-xl
        "
      >
        <div className="prose prose-neutral dark:prose-invert max-w-none pt-4">
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
