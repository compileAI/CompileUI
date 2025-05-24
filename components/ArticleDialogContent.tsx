"use client";

import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Keep Dialog parts needed for styling if any
import { MessageCircleMore } from "lucide-react";
import { Article } from "../types";

interface ArticleDialogContentProps {
  article: Article;
  formattedDate: string;
  onOpenChat: () => void;
}

export default function ArticleDialogContent(
  { article, formattedDate, onOpenChat }: ArticleDialogContentProps
) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-left text-lg sm:text-2xl font-semibold pt-2 px-2 sm:px-4 sm:pt-4">
          {article.title}
        </DialogTitle>
      </DialogHeader>

      <div className="text-sm text-muted-foreground px-2 sm:px-4">
        {formattedDate}
      </div>

      <div 
        className="overflow-y-auto flex-1 px-2 sm:px-4 py-2 sm:py-4 space-y-4"
        onDoubleClick={onOpenChat} // Or however you want to trigger full page view from here
      >
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>

      <div className="border-t pt-4 px-4">
        <div className="flex justify-end">
          <Button 
            onClick={onOpenChat}
            className="bg-blue-500 hover:bg-blue-600 transition-colors px-5 py-2 rounded-md flex items-center gap-2"
          >
            <MessageCircleMore className="h-5 w-5" />
            <span>Chat with this article</span>
          </Button>
        </div>
      </div>
    </>
  );
} 