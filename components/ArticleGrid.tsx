"use client";

import { useAutomations } from "@/hooks/useAutomations";
import AutomationCard from "./AutomationCard";
import { useEffect, useState } from "react";
import toast from 'react-hot-toast';

export default function ArticleGrid() {
  const [isMobile, setIsMobile] = useState(false);
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

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getSizeForIndex = (index: number): "hero" | "small" => {
    if (index === 0 || isMobile) return "hero";
    return "small";
  };

  const handleAutomationUpdate = async (
    cardNumber: number, 
    params: { retrieval_prompt: string; content_prompt: string; style_prompt: string }
  ) => {
    try {
      toast.loading('Saving automation...', { id: `save-${cardNumber}` });
      
      const automation = automations[cardNumber];
      if (automation) {
        await updateAutomation(cardNumber, params);
      } else {
        await createAutomation(cardNumber, params);
      }
      
      toast.success('Automation saved successfully!', { id: `save-${cardNumber}` });
    } catch (error) {
      console.error('Error updating automation:', error);
      toast.error('Failed to save automation. Please try again.', { id: `save-${cardNumber}` });
      throw error;
    }
  };

  const handleAutomationDelete = async (cardNumber: number) => {
    try {
      toast.loading('Deleting automation...', { id: `delete-${cardNumber}` });
      await deleteAutomation(cardNumber);
      toast.success('Automation deleted successfully!', { id: `delete-${cardNumber}` });
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast.error('Failed to delete automation. Please try again.', { id: `delete-${cardNumber}` });
      throw error;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Error State */}
      {error && (
        <div className="text-center py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div className={loading ? "" : "animate-in slide-in-from-bottom-4 duration-500 ease-out"}>
        {/* Loading Skeleton Grid */}
        {loading && (
          <div className="grid grid-cols-12 gap-3 auto-rows-[25vh]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`
                  ${getSizeForIndex(i) === "hero" ? "col-span-12 md:col-span-8 row-span-2" : "col-span-12 md:col-span-4 row-span-1"}
                  bg-muted
                  rounded-xl 
                  animate-pulse
                  p-4 md:p-5
                `}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="h-3 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-20"></div>
                  <div className="h-5 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-16"></div>
                </div>
                <div className={`h-6 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded mb-3 ${i === 0 ? "w-3/4" : "w-full"}`}></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded"></div>
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-5/6"></div>
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-4/5"></div>
                  <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Automation Cards Grid */}
        {!loading && (
          <div className="grid grid-cols-12 gap-3 auto-rows-[25vh]">
            {Array.from({ length: 6 }).map((_, index) => (
              <AutomationCard
                key={`automation-card-${index}`}
                automation={automations[index]}
                cardNumber={index}
                size={isMobile ? "hero" : getSizeForIndex(index)}
                onAutomationUpdate={handleAutomationUpdate}
                onAutomationDelete={handleAutomationDelete}
                getAutomationContent={getAutomationContent}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}