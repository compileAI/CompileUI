"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Article, ChatMessage } from "../types";
import MarkdownWithLatex from "@/components/ui/markdown-with-latex";
import { ChevronUp, ChevronDown, MessageCircle, X, ArrowLeft } from "lucide-react";
import RecommendedArticles from "./RecommendedArticles";
import { createClient } from "@/utils/supabase/client";
import Header from "./Header";
import ArticleFAQs from "./ArticleFAQs";
import { RECOMMENDATIONS_CONFIG } from '@/config/recommendations';
import { getRecentlyVisited, addRecentlyVisited } from '@/utils/recentlyVisited';
import VoiceInput from "@/components/ui/voice-input";


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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationsLoading, setCitationsLoading] = useState(false);
  const [citationsError, setCitationsError] = useState<string | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<boolean>(true);
  const [recs, setRecs] = useState<Article[]>([]);
  const [isCitationsOpen, setIsCitationsOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessagesVisible, setChatMessagesVisible] = useState(false);
  const [articleScrollPosition, setArticleScrollPosition] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);

  const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // 768px is the correct breakpoint for mobile, but I actually want it to use the mobile formatting at 1024px
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scrolling when mobile chat is open
  useEffect(() => {
    if (isMobile && chatVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, chatVisible]);

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
        
        // If the article already has citations, use them
        if (article.citations && article.citations.length > 0) {
          console.log(`[ChatPageClient] Using existing citations from article: ${article.citations.length} citations`);
          setCitations(article.citations);
          setCitationsLoading(false);
          return;
        }
        
        // Otherwise, fetch citations from the API as fallback
        console.log(`[ChatPageClient] No existing citations, fetching from API for article: ${article.article_id}`);
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
  }, [article.article_id, article.citations]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setRecsLoading(true);
        setRecsError(false);
        
        const excludeIds = getRecentlyVisited();
        
        const response = await fetch('/api/recommended-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: article.article_id,
            excludeIds,
            limit: RECOMMENDATIONS_CONFIG.DEFAULT_COUNT
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setRecs(data.articles || []);
      } catch (error) {
        console.error('Error fetching related articles:', error);
        setRecsError(true);
      } finally {
        setRecsLoading(false);
      }
    };

    if (article.article_id) {
      fetchRecommendations();
    }
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
          const messagesWithDateTimestamps = data.messages.map((msg: { timestamp: Date | string; [key: string]: unknown }) => ({
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
              // Desktop toggle - chat slides over related articles
      if (chatVisible) {
        // Closing chat - hide content first, then slide out
        setChatMessagesVisible(false);
        setTimeout(() => {
          setChatVisible(false);
        }, 200);
      } else {
        // Opening chat - slide in, then show content
        setChatVisible(true);
        // Show messages with a delay for smooth slide-in + fade-in
        setTimeout(() => {
          setChatMessagesVisible(true);
          // Scroll to bottom after messages are rendered
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }, 300);
      }
    }
  };

  // Helper function to send message with FAQ context
  const handleSendMessageWithContext = useCallback(async (question: string, faqAnswer: string) => {
    if (isLoading) return;

    // Auto-open chat when sending a message
    if (!chatVisible) {
      setChatVisible(true);
      setChatMessagesVisible(true);
    }

    setChatInput("");
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question, // Only show the question in chat
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Create a temporary assistant message that will be updated with streaming content
    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, initialAssistantMessage]);
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/ws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          history: messages,
          articleContext: {
            article_id: article.article_id,
            title: article.title,
            content: article.content
          },
          faqContext: faqAnswer // Pass FAQ answer as background context
        }),
      });

      if (!response.ok) {
        console.error(`Error Response: ${response.status} ${response.statusText} - ${response.url}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'start') {
                // Stream has started

              } else if (data.type === 'chunk' && data.content) {
                // Update the assistant message with new content
                assistantContent += data.content;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              } else if (data.type === 'complete') {
                // Streaming complete

                setIsLoading(false);
                setStreamingMessageId(null);
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error');
              }
            } catch (parseError) {
              console.warn('Failed to parse FAQ streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Update the assistant message with error content
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  }, [isLoading, messages, article, chatVisible]);

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
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (mobileTextareaRef.current) {
      mobileTextareaRef.current.style.height = 'auto';
    }
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Create a temporary assistant message that will be updated with streaming content
    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, initialAssistantMessage]);
    
    setIsLoading(true);
    setStreamingMessageId(assistantMessageId);

    try {
      const response = await fetch('/api/chat/ws', {
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

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'start') {
                // Stream has started

              } else if (data.type === 'chunk' && data.content) {
                // Update the assistant message with new content
                assistantContent += data.content;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              } else if (data.type === 'complete') {
                // Streaming complete

                setIsLoading(false);
                setStreamingMessageId(null);
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error');
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the assistant message with error content
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  }, [chatInput, isLoading, messages, article, chatVisible]);

  // Handle FAQ clicks - open chat and send question with answer as context
  const handleFAQClick = useCallback((question: string, answer: string) => {
    // Auto-open chat if not already open
    if (!chatVisible) {
      setChatVisible(true);
      setChatMessagesVisible(true);
    }

    // Send just the question, but include answer as background context
    handleSendMessageWithContext(question, answer);
  }, [chatVisible, handleSendMessageWithContext]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      handleSendMessage(initialMessage);
    }
  }, [initialMessage, handleSendMessage]);

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    const maxHeight = 200; // Max height in pixels (about 8-10 lines)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    autoResizeTextarea(e.target);
  };

  // Auto-resize when chatInput changes programmatically (e.g., voice input)
  useEffect(() => {
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
    if (mobileTextareaRef.current) {
      autoResizeTextarea(mobileTextareaRef.current);
    }
  }, [chatInput]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <Header />
      
      {/* Main content with sidebar spacing on desktop */}
      <div className="md:ml-56 flex-1 flex flex-col overflow-hidden">
        <div className={`flex-1 flex overflow-hidden ${chatVisible ? '' : 'max-w-[2000px] mx-auto'}`}>
        {/* Article Section - Takes 2/3 width on desktop, full width on mobile */}
        <div 
          ref={articleContentRef}
          data-testid="article-content-container"
          className={`
            h-full overflow-y-auto transition-all duration-500 ease-in-out
            ${isMobile 
              ? (chatVisible ? 'hidden' : 'w-full') // always full width on mobile, hidden when chat is open
              : 'w-2/3' // Always 2/3 width on desktop - no resize animation
            }
          `}
        >
          <div className="p-8">
            <div className=" max-w-4xl"> {/* removed mx-auto */}
              {/* Article Header */}
              <div className="mb-8">
                <div className={`${isMobile ? 'mb-4' : 'flex justify-between items-start mb-4'}`}>
                  <h1 className="text-2xl font-bold flex-1 mr-4">{article.title}</h1>
                  {/* Desktop Citations Button */}
                  {!isMobile && (
                    <div className="relative">
                      {/* Citations Dropdown Content */}
                      {isCitationsOpen && (
                        <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px] max-h-[300px] overflow-y-auto z-50">
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
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCitationsOpen(!isCitationsOpen)}
                        className="flex items-center gap-2 bg-card shadow-sm shrink-0"
                      >
                        Citations ({citations.length})
                        {isCitationsOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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
                
                <div className="prose prose-lg dark:prose-invert max-w-none [&_p]:mb-4">
                  <MarkdownWithLatex>{article.content}</MarkdownWithLatex>
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

                  {/* Chat - Bottom right */}
                  <div>
                    <Button
                      onClick={toggleChat}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
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
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-8">
                  <ArticleFAQs 
                    articleId={article.article_id}
                    onFAQClick={handleFAQClick}
                    isMobile={isMobile}
                  />
                </div>

                {/* Mobile Related Articles - Only show on mobile */}
                {isMobile && !recsError && (
                  <div className="mt-8 max-w-none">
                    <RecommendedArticles 
                      articles={recs}
                      loading={recsLoading}
                      onArticleClick={() => setChatVisible(false)}
                      layout="bottom"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar area: Only one is rendered at a time on desktop */}
        {!isMobile && (
          chatVisible ? (
            <div className="relative w-1/3 h-full z-20">
              {/* Border that appears immediately */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800 z-10"></div>
              {/* Chat container with transition */}
              <div className="w-full flex flex-col overflow-hidden h-full bg-background transition-all duration-500 ease-in-out">
                {/* Chat Section */}
              <div className="flex-1 flex flex-col h-full">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6">
                  <div className={`
                    transition-all duration-200 ease-out delay-300 w-full
                    ${chatMessagesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                  `}>
                    {messages.length > 0 && (
                      <div className="space-y-4 w-full">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex w-full ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 break-words ${
                                message.role === 'user'
                                  ? 'bg-zinc-800 text-zinc-100'
                                  : 'bg-zinc-100 dark:bg-zinc-800'
                              }`}
                            >
                              <div className="text-sm [&_p]:mb-4 break-words">
                                {message.role === 'assistant' ? (
                                  <MarkdownWithLatex>{message.content}</MarkdownWithLatex>
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
                          <div className="flex justify-start w-full">
                            <div className="bg-muted rounded-lg px-4 py-2">
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
                  sticky bottom-0 bg-background border-t border-zinc-200 dark:border-zinc-800 p-6 w-full overflow-hidden
                  transition-all duration-200 ease-out delay-300
                  ${chatMessagesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                `}>
                                <div className="relative flex items-center gap-2 w-full min-w-0">
                {/* Voice Input - inline with text input */}
                <VoiceInput
                              onTranscript={(transcript) => {
              setChatInput(transcript);
            }}
            onInterimTranscript={(transcript) => {
              setChatInput(transcript);
            }}
                  currentText={chatInput}
                  onError={(error) => console.error('Voice input error:', error)}
                  disabled={isLoading}
                  className="flex-shrink-0"
                />
                
                {/* Text Input */}
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask something about this article..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 bg-background min-w-0 resize-none overflow-hidden"
                />
                
                {/* Send Button */}
                <Button 
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !chatInput.trim()}
                  variant="secondary"
                  className="flex-shrink-0"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
                </div>
              </div>
              </div>
            </div>
          ) : (
            !recsError && (
              <div className="w-1/3 h-full overflow-y-auto bg-background/50 transition-all duration-500 ease-in-out">
              <div className="p-6">
                <RecommendedArticles 
                  articles={recs}
                  loading={recsLoading}
                  onArticleClick={() => setChatVisible(false)}
                  layout="sidebar"
                />
              </div>
            </div>
            )
          )
        )}

        {/* Mobile Chat Section - remains as overlay */}
        {isMobile && (
          <div 
            className={`
              transition-all duration-500 ease-in-out
              ${chatVisible 
                ? 'w-full flex flex-col h-full absolute inset-0 top-[97px] z-30 bg-background overflow-hidden' 
                : 'w-full absolute inset-0 top-[97px] z-30 bg-background translate-x-full pointer-events-none overflow-hidden'
              }
            `}
            style={{
              top: "var(--header-height)",
              height: "calc(100vh - var(--header-height))",
            }}
            aria-hidden={!chatVisible}
          >
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6">
              <div className={`
                transition-all duration-200 ease-out delay-300 w-full
                ${chatMessagesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
              `}>
                {messages.length > 0 && (
                  <div className="space-y-4 w-full">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex w-full ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 break-words ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm [&_p]:mb-4 break-words">
                            {message.role === 'assistant' ? (
                              <MarkdownWithLatex>{message.content}</MarkdownWithLatex>
                            ) : (
                              message.content
                            )}
                          </div>
                          <div className={`text-xs mt-1 flex items-center justify-between ${
                            message.role === 'user' 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span>
                                {message.timestamp instanceof Date 
                                  ? message.timestamp.toLocaleTimeString() 
                                  : new Date(message.timestamp).toLocaleTimeString()
                                }
                              </span>
                              {/* Show typing indicator for streaming messages */}
                              {message.role === 'assistant' && streamingMessageId === message.id && isLoading && (
                                <span className="text-primary text-xs">
                                  <span className="animate-pulse">●</span>
                                  <span className="animate-pulse" style={{ animationDelay: '0.3s' }}>●</span>
                                  <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>●</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && streamingMessageId && (
                      // Only show loading animation if the streaming message is empty
                      (() => {
                        const streamingMessage = messages.find(msg => msg.id === streamingMessageId);
                        const showLoading = !streamingMessage?.content.trim();
                        
                        return showLoading ? (
                          <div className="flex justify-start w-full">
                            <div className="bg-muted rounded-lg px-4 py-2">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-sm text-muted-foreground">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input */}
            <div className={`
              sticky bottom-0 bg-background border-t border-zinc-200 dark:border-zinc-800 p-6 w-full overflow-hidden
              transition-all duration-200 ease-out delay-300
              ${chatMessagesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}>
              <div className="relative flex items-center gap-2 w-full min-w-0">
                {/* Voice Input - inline with text input */}
                <VoiceInput
                              onTranscript={(transcript) => {
              setChatInput(transcript);
            }}
            onInterimTranscript={(transcript) => {
              setChatInput(transcript);
            }}
                  currentText={chatInput}
                  onError={(error) => console.error('Voice input error:', error)}
                  disabled={isLoading}
                  className="flex-shrink-0"
                />
                
                {/* Text Input */}
                <textarea
                  ref={mobileTextareaRef}
                  value={chatInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask something about this article..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 bg-background min-w-0 resize-none overflow-hidden"
                />
                
                {/* Send Button */}
                <Button 
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !chatInput.trim()}
                  variant="secondary"
                  className="flex-shrink-0"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}