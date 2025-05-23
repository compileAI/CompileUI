"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Article } from "../types";

interface ChatPageClientProps {
  article: Article;
}

export default function ChatPageClient({ article }: ChatPageClientProps) {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");

  const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky border-b border-zinc-200 dark:border-zinc-800 top-0 z-50 bg-white dark:bg-zinc-900 py-4 lg:px-8 px-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/demo/discover")}
            className="text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            Compile.
          </button>
        </div>
      </div>
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-3xl lg:px-8 px-4 py-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold">{article.title}</h1>
          </div>
          
          <div className="text-sm text-muted-foreground mb-6">
            {formattedDate}
          </div>
          
          <div className="prose prose-lg dark:prose-invert mb-8">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
          
          <div>
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
      </div>
    </div>
  );
} 