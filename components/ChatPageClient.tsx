"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Article, ChatMessage } from "../types";

interface ChatPageClientProps {
  article: Article;
  initialMessage?: string;
}

interface Citation {
  sourceName: string;
  articleTitle: string;
  url: string | null;
}

export default function ChatPageClient({ article, initialMessage }: ChatPageClientProps) {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationsLoading, setCitationsLoading] = useState(true);
  const [citationsError, setCitationsError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Fetch citations
  useEffect(() => {
    const fetchCitations = async () => {
      try {
        setCitationsLoading(true);
        setCitationsError(null);
        
        const response = await fetch(`/api/fetchArticles?articleId=${article.article_id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch citations');
        }
        
        setCitations(data.citations || []);
      } catch (error) {
        console.error('Error fetching citations:', error);
        setCitationsError('Failed to load citations');
      } finally {
        setCitationsLoading(false);
      }
    };

    fetchCitations();
  }, [article.article_id]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Use useCallback to stabilize the handleSendMessage function reference
  const handleSendMessage = useCallback(async (messageToSend?: string) => {
    const messageContent = messageToSend || chatInput.trim();
    if (!messageContent || isLoading) return;

    setChatInput("");
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          history: messages,
          articleContext: {
            article_id: article.article_id,
            title: article.title,
            content: article.content
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [chatInput, isLoading, messages, article]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      handleSendMessage(initialMessage);
    }
  }, [initialMessage, handleSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    // MODIFIED: Changed min-h-screen to h-screen and added overflow-hidden
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="sticky border-b border-zinc-200 dark:border-zinc-800 top-0 z-50 bg-white dark:bg-zinc-900 py-4 lg:px-8 px-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/demo/discover")}
            className="text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
          >
            Compile.
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Article Section - Left Side */}
        <div className="w-1/2 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
          <div className="h-full p-8"> {/* h-full ensures padding is within the scrollable area */}
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <h1 className="text-xl font-bold">{article.title}</h1>
                </div>
                
                <div className="text-sm text-muted-foreground mb-6">
                  {formattedDate}
                </div>
                
                <div className="prose prose-lg dark:prose-invert">
                  <ReactMarkdown>{article.content}</ReactMarkdown>
                </div>

                {/* Citations Section */}
                <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold mb-4">Citations</h2>
                  
                  {citationsLoading ? (
                    <p className="text-sm text-zinc-500">Loading citations...</p>
                  ) : citationsError ? (
                    <p className="text-sm text-red-500">{citationsError}</p>
                  ) : citations.length > 0 ? (
                    <ul className="space-y-2">
                      {citations.map((citation, index) => (
                        <li key={index} className="text-sm">
                          <span className="font-medium">{citation.sourceName}: </span>
                          {citation.url ? (
                            <a 
                              href={citation.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {citation.articleTitle || 'Untitled'}
                            </a>
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {citation.articleTitle || 'Untitled'}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500">No citations available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Section - Right Side */}
        <div className="w-1/2 flex flex-col overflow-hidden"> 
          <div className="flex-1 flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-6 pt-6">
              {messages.length > 0 && (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'bg-zinc-100 dark:bg-zinc-800'
                        }`}
                      >
                        <div className="text-sm">
                          {message.role === 'assistant' ? (
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          ) : (
                            message.content
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${
                          message.role === 'user' 
                            ? 'text-zinc-400' 
                            : 'text-muted-foreground'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input - Sticky at bottom of its flex container */}
            <div className="sticky bottom-0 bg-background border-t border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask something about this article..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 bg-background"
                />
                <Button 
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !chatInput.trim()}
                  variant="secondary"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}