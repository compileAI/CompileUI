"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { FAQ } from "@/types";
import { fetchFAQsForArticle } from "@/lib/fetchFAQs";

interface ArticleFAQsProps {
  articleId: string;
  onFAQClick: (question: string, answer: string) => void;
  isMobile: boolean;
}

export default function ArticleFAQs({ articleId, onFAQClick, isMobile }: ArticleFAQsProps) {
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

  if (isMobile) {
    return (
      <div className="relative mb-4">
        {/* Mobile Dropdown Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Questions ({faqs.length})</span>
          {isDropdownOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile Dropdown Content */}
        {isDropdownOpen && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 z-10">
            <div className="space-y-2">
              {faqs.map((faq) => (
                <Button
                  key={faq.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFAQClick(faq)}
                  className="w-full text-left justify-start h-auto min-h-[2.5rem] p-3 text-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 whitespace-normal text-wrap leading-tight"
                >
                  {faq.question_short}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop Layout - 3 buttons spanning full width
  return (
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-3 items-stretch">
        {faqs.map((faq) => (
          <Button
            key={faq.id}
            variant="outline"
            size="sm"
            onClick={() => handleFAQClick(faq)}
            className="h-auto min-h-[3rem] p-3 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 whitespace-normal text-wrap leading-tight flex items-center justify-center"
          >
            {faq.question_short}
          </Button>
        ))}
      </div>
    </div>
  );
} 