"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Article } from "@/types";

interface FullPageChatViewProps {
  article: Article;
  formattedDate: string;
  onClose: () => void;
}

export default function FullPageChatView({ article, formattedDate, onClose }: FullPageChatViewProps) {
  const [chatInput, setChatInput] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">{article.title}</h2>
        <Button variant="outline" onClick={onClose}>Back</Button>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4">
        {formattedDate}
      </div>
      
      <div className="overflow-y-auto flex-1 space-y-4">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>
      
      <div className="border-t pt-4 mt-auto">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button>Send</Button>
        </div>
      </div>
    </div>
  );
} 