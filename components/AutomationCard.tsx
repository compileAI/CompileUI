"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Automation, AutomationContent } from "@/types";


interface AutomationCardProps {
  automation: Automation | null;
  cardNumber: number;
  size: "hero" | "small";
  getAutomationContent: (cardNumber: number) => Promise<AutomationContent | null>;
  isAuthenticated: boolean;
}

export default function AutomationCard({ 
  automation, 
  cardNumber, 
  size, 
  getAutomationContent,
  isAuthenticated 
}: AutomationCardProps) {
  const router = useRouter();

  const [content, setContent] = useState<AutomationContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  const sizeClasses = {
    hero: "col-span-12 md:col-span-8 row-span-2",
    small: "col-span-12 md:col-span-4 row-span-1"
  };

  const titleClasses = {
    hero: "text-2xl md:text-3xl font-bold",
    small: "text-lg font-semibold"
  };

  const contentClasses = {
    hero: "text-base line-clamp-6",
    small: "text-sm line-clamp-3"
  };

  const loadContent = useCallback(async () => {
    if (!automation) return;
    
    setIsLoadingContent(true);
    
    try {
      const automationContent = await getAutomationContent(cardNumber);
      setContent(automationContent);
    } catch (_error) {
      console.error('Error loading automation content:', _error);
      // Don't show error in the card - just fail silently
    } finally {
      setIsLoadingContent(false);
    }
  }, [automation, getAutomationContent, cardNumber]);

  // Load content on mount if automation exists (works for both demo and authenticated users)
  useEffect(() => {
    if (automation) {
      loadContent();
    }
  }, [automation, loadContent]);

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return "Invalid date";
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch {
      return "Invalid date";
    }
  };

  const stripMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')     // Remove bold **text**
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '$1') // Remove italic *text* but not ** or single *
      .replace(/`(.*?)`/g, '$1')           // Remove code `text`
      .replace(/#{1,6}\s+/g, '')           // Remove headers # ## ###
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // Remove links [text](url), keep text
      .replace(/^\s*[\*\-\+]\s+/gm, '')    // Remove bullet points * - +
      .replace(/^\s*\d+\.\s+/gm, '')       // Remove numbered lists 1. 2.
      .replace(/\n+/g, ' ')                // Replace multiple newlines with single space
      .replace(/\s+/g, ' ')                // Replace multiple spaces with single space
      .trim();
  };

  const handleCardClick = () => {
    if (!isAuthenticated && !automation) {
      // Only redirect to auth if no automation exists (no demo content)
      router.push('/auth');
      return;
    }
    router.push(`/automation/${cardNumber}`);
  };

  // Show sign-in prompt for unauthenticated users ONLY when no automation exists
  if (!isAuthenticated && !automation) {
    return (
      <article
        className={`
          ${sizeClasses[size]}
          bg-card 
          border border-border 
          rounded-xl p-4 md:p-5 
          shadow-sm hover:shadow-md
          transition-all duration-200
          flex flex-col items-center justify-center
          text-center cursor-pointer
          hover:border-primary hover:bg-primary/5
        `}
        onClick={handleCardClick}
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Sign in to create automations
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Personalize your content with custom AI automations
        </p>
        <Button size="sm">
          Sign In
        </Button>
      </article>
    );
  }

  // Show placeholder for empty automation slot (authenticated users only)
  if (!automation && isAuthenticated) {
    return (
        <article
          className={`
            ${sizeClasses[size]}
            bg-card 
            border border-dashed border-border 
            rounded-xl p-4 md:p-5 
            shadow-sm hover:shadow-md 
            transition-all duration-200 
            flex flex-col items-center justify-center
            text-center cursor-pointer
            hover:border-primary hover:bg-primary/5
          `}
          onClick={handleCardClick}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Create Automation
          </h3>
          <p className="text-sm text-muted-foreground">
            Set up a custom AI automation for this card
          </p>
        </article>
      );
  }

  // Show automation with content preview
  const displayContent = content ? stripMarkdown(content.content) : '';
  const automationName = automation ? automation.params.name : null;
  const title = content?.title || null;

  return (
      <article
        className={`
          ${sizeClasses[size]}
          bg-card 
          border border-border 
          rounded-xl p-4 md:p-5 
          shadow-sm hover:shadow-md 
          transition-all duration-200 
          cursor-pointer 
          hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20
          overflow-hidden
          flex flex-col
        `}
        onClick={handleCardClick}
      >
        {/* Title */}
        {title && (
          <h2 className={`${titleClasses[size]} text-foreground mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
            {title}
          </h2>
        )}

        {/* Content Preview */}
        <div className={`${contentClasses[size]} text-muted-foreground leading-relaxed flex-grow fade-text-out`}>
          {isLoadingContent ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
              <div className="h-4 bg-muted rounded animate-pulse w-4/5"></div>
            </div>
          ) : displayContent ? (
            displayContent
          ) : (
            <div className="text-left">
              <p className="text-black font-medium mb-2">Automation is scheduled to run</p>
              <p className="text-muted-foreground/60 text-sm">
                Your automation will run each morning and the results will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${size !== "hero" ? "mt-2 pt-2" : "mt-4 pt-3"} border-t border-border flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {content && (
                <>
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(content.created_at)}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {automationName}
              </span>
              <div className={`w-2 h-2 rounded-full ${automation?.active ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
          </div>
        </div>
      </article>
    );
} 