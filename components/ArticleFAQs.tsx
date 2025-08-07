"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { FAQ } from "@/types";
import { fetchFAQsForArticle } from "@/lib/fetchFAQs";
import MarkdownWithLatex from "@/components/ui/markdown-with-latex";

interface ArticleFAQsProps {
  articleId: string;
  onFAQClick: (question: string, answer: string) => void;
  isMobile: boolean;
  layout?: 'side' | 'bottom' | 'chat';
}

export default function ArticleFAQs({ articleId, onFAQClick, isMobile, layout = 'bottom' }: ArticleFAQsProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const loadFAQs = async () => {
      setLoading(true);
      try {
        const fetchedFAQs = await fetchFAQsForArticle(articleId);
        setFaqs(fetchedFAQs);
      } catch (error) {
        console.error('Error loading FAQs:', error);
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, [articleId]);

  // Don't render anything if no FAQs (as per requirements)
  if (loading || faqs.length === 0) {
    return null;
  }

  const handleFAQClick = (faq: FAQ) => {
    onFAQClick(faq.question, faq.answer);
    if (isMobile && isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };

  // Mobile dropdown version (except in chat layout)
  if (isMobile && layout !== 'chat') {
    return (
      <div className="relative mb-4">
        {/* Mobile Dropdown Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 bg-muted hover:bg-accent border-border w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>Related Questions ({faqs.length})</span>
          </div>
          {isDropdownOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile Dropdown Content */}
        {isDropdownOpen && (
                      <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-lg shadow-lg p-2 z-10">
            <div className="space-y-1">
              {faqs.map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => handleFAQClick(faq)}
                  className="w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {faq.question_short}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Get container styles based on layout
  const containerClasses = {
    side: 'mb-4',
    bottom: 'mb-4',
    chat: ''
  }[layout];

  const cardClasses = 'dark:border-gray-800 rounded-lg p-4';

  // Desktop Layout
  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          Related Questions
        </h3>
        <div className="space-y-1">
          {faqs.map((faq) => (
            <button
              key={faq.id}
              onClick={() => handleFAQClick(faq)}
              className="w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <MarkdownWithLatex>{faq.question_short}</MarkdownWithLatex>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 