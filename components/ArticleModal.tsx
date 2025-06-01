"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { EnhancedArticle, ChatMessage } from "@/types";

interface ArticleModalProps {
  article: EnhancedArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ArticleModal({ article, isOpen, onClose }: ArticleModalProps) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formattedDate = article ? new Date(article.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : "";

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setChatInput("");
      setIsLoading(false);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (messageToSend?: string) => {
    if (!article) return;
    
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
            content: article.tuned || article.content // Use the enhanced content
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!article) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-[90vh] p-0 overflow-hidden sm:max-w-[90vw] [&>*:last-child]:hidden">
        <DialogTitle className="sr-only">
          {article.title} - Read and Chat
        </DialogTitle>
        
        {/* Close Button - Top Right */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 z-50"
        >
          <X className="w-4 h-4" />
        </Button>
        
        <div className="flex-1 flex overflow-hidden h-full">
          {/* Article Section - Left Side */}
          <div className="w-1/2 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
            <div className="h-full p-8">
              <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold">{article.title}</h1>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-6">
                    {formattedDate}
                  </div>
                  
                  <div className="prose prose-lg dark:prose-invert">
                    <ReactMarkdown>{article.tuned || article.content}</ReactMarkdown>
                  </div>

                  {/* Citations Section */}
                  <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold mb-4">Citations</h2>
                    
                    {article.citations && article.citations.length > 0 ? (
                      <ul className="space-y-2">
                        {article.citations.map((citation, index) => (
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
                {messages.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-zinc-500">
                      <p className="text-lg mb-2">Start a conversation</p>
                      <p className="text-sm">Ask questions about this article to get started</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input - Sticky at bottom */}
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
      </DialogContent>
    </Dialog>
  );
} 