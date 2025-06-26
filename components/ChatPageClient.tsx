"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Article, ChatMessage } from "../types";
import { ChevronUp, ChevronDown, MessageCircle, X, ArrowLeft } from "lucide-react";
import RecommendedArticles from "./RecommendedArticles";
import { addRecentlyVisited } from "@/utils/recentlyVisited";
import { createClient } from "@/utils/supabase/client";
import Header from "./Header";

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
  const [citationsLoading, setCitationsLoading] = useState(false);
  const [citationsError, setCitationsError] = useState<string | null>(null);
  const [isCitationsOpen, setIsCitationsOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessagesVisible, setChatMessagesVisible] = useState(false);
  const [articleScrollPosition, setArticleScrollPosition] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset chat visibility and clear messages when article changes
  useEffect(() => {
    setChatVisible(false);
    setChatMessagesVisible(false);
    setMessages([]);
    setIsCitationsOpen(false);
    initialMessageSentRef.current = false;
    // Track that this article was visited (for recently visited exclusion)
    addRecentlyVisited(article.article_id);
  }, [article.article_id]);

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

  // Load chat history for authenticated users
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // No authenticated user, don't load history
          console.log('[ChatPageClient] No authenticated user, skipping chat history load');
          return;
        }

        console.log(`[ChatPageClient] Loading chat history for user ${user.id} and article ${article.article_id}`);
        
        const response = await fetch(`/api/chat-history?article_id=${article.article_id}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          console.warn(`[ChatPageClient] Failed to fetch chat history: ${response.status}`);
          return;
        }

        const data = await response.json();
        
        if (data.success && data.messages) {
          console.log(`[ChatPageClient] Loaded ${data.messages.length} chat messages`);
          // Ensure timestamps are Date objects
          const messagesWithDateTimestamps = data.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
          }));
          setMessages(messagesWithDateTimestamps);
        }
      } catch (error) {
        console.error('[ChatPageClient] Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [article.article_id]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle mobile scroll position saving/restoring
  const saveArticleScrollPosition = () => {
    if (articleContentRef.current && isMobile) {
      setArticleScrollPosition(articleContentRef.current.scrollTop);
    }
  };

  const restoreArticleScrollPosition = () => {
    if (articleContentRef.current && isMobile) {
      articleContentRef.current.scrollTop = articleScrollPosition;
    }
  };

  // Handle chat visibility toggle
  const toggleChat = () => {
    if (isMobile && chatVisible) {
      // Switching from chat to article on mobile - restore scroll position
      setChatVisible(false);
      setChatMessagesVisible(false);
      setTimeout(restoreArticleScrollPosition, 0);
    } else if (isMobile && !chatVisible) {
      // Switching from article to chat on mobile - save scroll position
      saveArticleScrollPosition();
      setChatVisible(true);
      // Show messages immediately on mobile
      setChatMessagesVisible(true);
      // Scroll to bottom of chat after opening
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      // Desktop toggle
      if (chatVisible) {
        // Closing chat - hide content first, then panel
        setChatMessagesVisible(false);
        setTimeout(() => {
          setChatVisible(false);
        }, 200);
      } else {
        // Opening chat - show panel, then content with animation
        setChatVisible(true);
        // Show messages with a slight delay for smooth fade-in
        setTimeout(() => {
          setChatMessagesVisible(true);
          // Scroll to bottom after messages are rendered
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }, 400);
      }
    }
  };

  // Use useCallback to stabilize the handleSendMessage function reference
  const handleSendMessage = useCallback(async (messageToSend?: string) => {
    const messageContent = messageToSend || chatInput.trim();
    if (!messageContent || isLoading) return;

    // Auto-open chat when sending a message
    if (!chatVisible) {
      setChatVisible(true);
      setChatMessagesVisible(true);
    }

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
        console.error(`Error Response: ${response.status} ${response.statusText} - ${response.url}`);
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
  }, [chatInput, isLoading, messages, article, chatVisible]);

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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Article Section */}
        <div 
          ref={articleContentRef}
          data-testid="article-content-container"
          className={`
            h-full overflow-y-auto transition-all duration-500 ease-in-out
            ${isMobile 
              ? (chatVisible ? 'hidden' : 'w-full')
              : (chatVisible 
                  ? 'w-1/2' 
                  : 'w-full'
                )
            }
            ${!isMobile && chatVisible ? 'border-r border-zinc-200 dark:border-zinc-800' : ''}
          `}
        >
          <div className="p-8">
            <div className={`mx-auto ${chatVisible && !isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
              {/* Article Header */}
              <div className="mb-8">
                <div className={`${isMobile ? 'mb-4' : 'flex justify-between items-start mb-4'}`}>
                  <h1 className="text-2xl font-bold flex-1 mr-4">{article.title}</h1>
                  {/* Desktop Chat Button */}
                  {!isMobile && (
                    <Button
                      onClick={toggleChat}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 shrink-0"
                    >
                      {chatVisible ? (
                        <>
                          <X className="h-4 w-4" />
                          Close Chat
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4" />
                          Chat
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground mb-6">
                  {formattedDate}
                </div>

                {/* Mobile Chat Button - Between date and content */}
                {isMobile && (
                  <div className="mb-6">
                    <Button
                      onClick={toggleChat}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Show Chat
                    </Button>
                  </div>
                )}
                
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown>{article.content}</ReactMarkdown>
                </div>

                {/* Bottom controls - Citations on right, Back button on left */}
                <div className="flex justify-between items-center mt-8 mb-8">
                  {/* Back button - Bottom left */}
                  <div>
                    <Button
                      onClick={() => router.back()}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      title="Go back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  </div>

                  {/* Citations - Bottom right */}
                  <div className="relative">
                    {/* Citations Dropdown Content */}
                    {isCitationsOpen && (
                      <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px] max-h-[300px] overflow-y-auto">
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
                    )}
                    
                    {/* Citations Toggle Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCitationsOpen(!isCitationsOpen)}
                      className="flex items-center gap-2 bg-white dark:bg-zinc-900 shadow-sm"
                    >
                      Citations ({citations.length})
                      {isCitationsOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Recommended Articles Section */}
              <div className="max-w-none">
                <RecommendedArticles 
                  currentArticleId={article.article_id}
                  onArticleClick={() => setChatVisible(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chat Section - Always rendered for smooth animations */}
        <div 
          className={`
            transition-all duration-500 ease-in-out
            ${isMobile 
              ? (chatVisible 
                  ? 'w-full absolute inset-0 top-[97px] z-30 bg-background' 
                  : 'w-full absolute inset-0 top-[97px] z-30 bg-background translate-x-full pointer-events-none'
                )
              : (chatVisible 
                  ? 'w-1/2 flex flex-col overflow-hidden' 
                  : 'w-0 flex flex-col overflow-hidden pointer-events-none'
                )
            }
          `}
          aria-hidden={!chatVisible}
        >
          <div className="flex-1 flex flex-col h-full">
            {/* Mobile Back to Article Button */}
            {isMobile && (
              <div className={`
                border-b border-zinc-200 dark:border-zinc-800 p-4
                transition-all duration-200 ease-out delay-300
                ${chatMessagesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
              `}>
                <Button
                  onClick={toggleChat}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Back to Article
                </Button>
              </div>
            )}
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-6 pt-6">
              <div className={`
                transition-all duration-200 ease-out delay-300
                ${chatMessagesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
              `}>
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
                            {message.timestamp instanceof Date 
                              ? message.timestamp.toLocaleTimeString() 
                              : new Date(message.timestamp).toLocaleTimeString()
                            }
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
            </div>

            {/* Chat Input */}
            <div className={`
              sticky bottom-0 bg-background border-t border-zinc-200 dark:border-zinc-800 p-6
              transition-all duration-200 ease-out delay-300
              ${chatMessagesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}>
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