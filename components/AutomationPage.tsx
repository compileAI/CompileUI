"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, AlertCircle, Eye, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAutomations } from "@/hooks/useAutomations";
import { AutomationContent } from "@/types";
import AutomationForm from "./AutomationForm";
import Header from "./Header";
import toast from 'react-hot-toast';
import { useState as useReactState } from "react";

interface AutomationPageProps {
  cardNumber: number;
}

export default function AutomationPage({ cardNumber }: AutomationPageProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<AutomationContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [automationName, setAutomationName] = useState("");
  
  const { 
    automations, 
    loading, 
    error, 
    user, 
    createAutomation, 
    updateAutomation, 
    deleteAutomation,
    getAutomationContent 
  } = useAutomations();

  const automation = automations[cardNumber];

  // Set placeholder name based on card number
  useEffect(() => {
    const placeholderNames = [
      "Daily Tech News",
      "Investment Deals", 
      "Market Analysis",
      "Industry Updates",
      "Research Papers",
      "Startup News"
    ];
    setAutomationName(placeholderNames[cardNumber] || `Automation ${cardNumber + 1}`);
  }, [cardNumber]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [loading, user, router]);

  // Load content only when component first mounts and has automation
  useEffect(() => {
    if (automation && user && !content) {
      loadContent();
    }
  }, [automation, user]); // Removed activeTab and content dependencies to prevent re-loading

  // Set initial editing state based on whether automation exists, but only after loading
  useEffect(() => {
    if (!loading && !automation) {
      setIsEditing(true);
    }
  }, [loading, automation]);

  // Scroll to top on mount to fix header off-screen after refresh
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pageRef.current) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const loadContent = async () => {
    if (!automation) return;
    
    setIsLoadingContent(true);
    setContentError(null);
    
    try {
      const automationContent = await getAutomationContent(cardNumber);
      setContent(automationContent);
    } catch (error) {
      console.error('Error loading automation content:', error);
      setContentError('Failed to load content');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleAutomationUpdate = async (
    _: number, 
    params: { retrieval_prompt: string; content_prompt: string; style_prompt: string }
  ) => {
    try {
      toast.loading('Saving automation...', { id: `save-${cardNumber}` });
      
      if (automation) {
        await updateAutomation(cardNumber, params);
      } else {
        await createAutomation(cardNumber, params);
      }
      
      toast.success('Automation saved successfully!', { id: `save-${cardNumber}` });
      
      // Switch to view mode after saving and reload content
      setIsEditing(false);
      setTimeout(() => {
        loadContent();
      }, 1000);
    } catch (error) {
      console.error('Error updating automation:', error);
      toast.error('Failed to save automation. Please try again.', { id: `save-${cardNumber}` });
      throw error;
    }
  };

  const handleDiscardChanges = () => {
    if (!automation) {
      router.push('/home');
    } else {
      setIsEditing(false);
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return "Invalid date";
      }
      
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(dateObj);
    } catch (error) {
      console.warn('Error formatting date:', error, 'Date value:', date);
      return "Invalid date";
    }
  };

  // Animated dots for loading
  function LoadingDots() {
    const [dotCount, setDotCount] = useReactState(1);
    useEffect(() => {
      const interval = setInterval(() => {
        setDotCount((c) => (c % 3) + 1);
      }, 400);
      return () => clearInterval(interval);
    }, []);
    return <span>{'.'.repeat(dotCount)}</span>;
  }

  function InlineSpinner() {
    return <Loader2 className="inline-block w-4 h-4 mr-2 animate-spin text-muted-foreground align-middle" />;
  }

  // Show loading state while checking auth and loading automations
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex flex-col bg-white">
          <div className="max-w-6xl mx-auto px-6 pt-8 pb-8 w-full">
            <div className="pt-4 mb-6">
              <div className="flex items-end justify-between">
                <h1 className="text-4xl font-bold text-foreground">{automationName}</h1>
                <div />
              </div>
              <div className="border-b border-gray-200 w-full mt-4" />
            </div>
            <div className="bg-white rounded-3xl min-h-[400px]">
              <div className="text-left pt-0 pl-0 flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground mb-2 mt-0 flex items-center">
                  <InlineSpinner />
                  Loading automation<LoadingDots />
                </h2>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-4">Error Loading Automation</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push('/home')} size="lg">
              <ArrowLeft className="h-4 w-4 mr-2 text-black" />
              Back to Home
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen" ref={pageRef}>
        {/* Main Content Container */}
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-8">
          {/* Title Bar */}
          <div className="pt-4 mb-6">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={automationName}
                      onChange={e => setAutomationName(e.target.value)}
                      className="text-4xl font-bold text-foreground bg-transparent border-none outline-none focus:ring-0 p-0 m-0 w-full"
                      style={{ appearance: 'none' }}
                      aria-label="Automation Name"
                    />
                    {/* Active Pill (Edit) */}
                    {automation?.active && (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        Active
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className="text-4xl font-bold text-foreground">{automationName}</h1>
                    {/* Active Pill (View) */}
                    {automation?.active && (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        Active
                      </span>
                    )}
                  </>
                )}
                {/* Loading Spinner in place of pill if loading */}
                {loading && (
                  <Loader2 className="inline-block w-5 h-5 animate-spin text-muted-foreground align-middle ml-1" />
                )}
              </div>
              <div className="flex items-end gap-2 ml-4 mt-2">
                <button
                  className={`px-4 pb-2 text-base font-medium focus:outline-none transition-colors border-b-2 ${!isEditing ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
                  onClick={() => setIsEditing(false)}
                  type="button"
                >
                  View
                </button>
                <button
                  className={`px-4 pb-2 text-base font-medium focus:outline-none transition-colors border-b-2 ${isEditing ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
                  onClick={() => setIsEditing(true)}
                  type="button"
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="border-b border-gray-200 w-full mt-4" />
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-3xl min-h-[400px]">
            {isEditing ? (
              <AutomationForm
                automation={automation}
                onSave={(params) => handleAutomationUpdate(cardNumber, params)}
                onDiscard={handleDiscardChanges}
                size="hero"
              />
            ) : (
              <div>
                {isLoadingContent ? (
                  <div className="text-left pt-0 pl-0 flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground mb-2 mt-0 flex items-center">
                      {/* Empty space for title alignment */}
                      <span className="inline-block w-0 h-0" />
                      Loading automation<LoadingDots />
                    </h2>
                    {/* Spinner in place of pill */}
                    <Loader2 className="inline-block w-5 h-5 animate-spin text-muted-foreground align-middle ml-1" />
                  </div>
                ) : contentError ? (
                  <div className="text-center py-16">
                    <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
                    <h2 className="text-xl font-bold text-foreground mb-4">Failed to load content</h2>
                    <p className="text-base text-muted-foreground mb-6 max-w-md mx-auto">{contentError}</p>
                    <Button onClick={loadContent} size="lg">
                      Try Again
                    </Button>
                  </div>
                ) : !content ? (
                  <div className="text-left pt-0 pl-0">
                    <h2 className="text-xl font-semibold text-foreground mb-2 mt-0">No content generated yet</h2>
                    <p className="text-base text-muted-foreground">
                      Content will be generated automatically each morning and displayed here.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Content Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                      <div className="text-sm text-muted-foreground">
                        Generated {formatDate(content.created_at)}
                      </div>
                      <Button onClick={loadContent} variant="outline" size="sm">
                        Refresh
                      </Button>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-foreground mb-6 leading-tight">
                      {content.title}
                    </h2>

                    {/* Content */}
                    <div className="prose prose-base prose-neutral dark:prose-invert max-w-none">
                      <div className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                        {content.content}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Generated from automation
                        </span>
                        <Badge variant="outline">
                          {automation?.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 