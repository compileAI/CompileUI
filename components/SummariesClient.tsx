"use client";

import { useEffect, useState, useRef } from "react";
import { HlcArticle } from "@/types";
import SummarySection from "./SummarySection";
import Header from "./Header";
import { Button } from "./ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { logger } from "@/lib/logger";

export default function SummariesClient() {
  const [summaries, setSummaries] = useState<HlcArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch summaries on component mount
  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/high-level-summaries');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch summaries');
        }
        
        if (data.success && data.summaries) {
          logger.info('SummariesClient', `Loaded ${data.summaries.length} summaries`, { summaries: data.summaries });
          
          // Log article counts for each summary
          data.summaries.forEach((summary: HlcArticle, index: number) => {
            logger.debug('SummariesClient', `Summary ${index + 1} "${summary.title}": ${summary.articles?.length || 0} articles`, { articles: summary.articles });
          });
          
          setSummaries(data.summaries);
        } else {
          throw new Error('No summaries data received');
        }
      } catch (err) {
        logger.error('SummariesClient', 'Error fetching summaries', { error: err instanceof Error ? err.message : String(err) });
        setError(err instanceof Error ? err.message : 'Failed to load summaries');
      } finally {
        setLoading(false);
      }
    };

        fetchSummaries();
  }, []);

  // Handle scroll to specific section
  const scrollToSection = (index: number) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const sectionHeight = window.innerHeight - 64; // 4rem = 64px
    const separatorHeight = 1; // 1px separator
    const targetScrollTop = index * (sectionHeight + separatorHeight);
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
    
    setCurrentIndex(index);
  };

  // Handle previous/next navigation
  const navigatePrevious = () => {
    if (currentIndex > 0) {
      scrollToSection(currentIndex - 1);
    }
  };

  const navigateNext = () => {
    if (currentIndex < summaries.length - 1) {
      scrollToSection(currentIndex + 1);
    }
  };

  // Handle scroll events to update current index
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || summaries.length === 0) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const sectionHeight = window.innerHeight - 64; // 4rem = 64px
      const separatorHeight = 1; // 1px separator
      const totalSectionHeight = sectionHeight + separatorHeight;
      const newIndex = Math.round(scrollTop / totalSectionHeight);
      
      const clampedIndex = Math.max(0, Math.min(newIndex, summaries.length - 1));
      
      if (clampedIndex !== currentIndex) {
        setCurrentIndex(clampedIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [summaries.length, currentIndex]);

  return (
    <>
      <Header />
      
      {/* Main content with sidebar spacing on desktop */}
      <div className="md:ml-56 min-h-screen bg-background">
        <div className="relative min-h-screen lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="min-h-screen lg:h-full lg:overflow-y-auto">
              {Array.from({ length: 3 }).map((_, index) => {
                const isEven = index % 2 === 0;
                const sectionBg = isEven ? "bg-background" : "bg-muted/20";
                
                return (
                  <div key={index}>
                    <section 
                      className={`min-w-full min-h-screen flex-shrink-0 px-4 sm:px-4 md:px-8 py-6 sm:py-4 lg:py-6 mb-0 ${sectionBg} relative animate-pulse`}
                    >
                                              <div className="max-w-6xl mx-auto min-h-full flex flex-col">
                        {/* Title and Date Skeleton */}
                        <div className="space-y-1 mb-6">
                          <div className="h-8 sm:h-10 md:h-12 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-2/3"></div>
                          <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-32"></div>
                        </div>

                        {/* Summary Content Skeleton - Full Width with Border */}
                        <div className="border-l-4 border-muted-foreground/20 pl-4 sm:pl-6 pr-2 sm:pr-4 mb-4 sm:mb-8">
                          <div className="space-y-3">
                            <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-full"></div>
                            <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-5/6"></div>
                            <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-4/5"></div>
                            <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-full"></div>
                            <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-3/4"></div>
                          </div>
                        </div>

                        {/* Featured Article Skeleton */}
                        <div className="mb-4 sm:mb-8 lg:flex-1 pt-1 sm:pt-4">
                          <div className="space-y-1 sm:space-y-3">
                            <div className="h-4 sm:h-5 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-32"></div>
                            <div className="w-full rounded-xl p-4 sm:p-6 flex items-center justify-between border bg-muted/50">
                              <div className="flex-1 min-w-0">
                                <div className="h-5 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded mb-2 w-3/4"></div>
                                <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-24"></div>
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                <div className="h-4 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-16"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Simple Articles Section */}
                        <div className="lg:mt-auto pt-1 sm:pt-4">
                          <div className="flex items-center justify-between mb-2 sm:mb-5">
                            <div className="h-4 sm:h-5 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded w-24"></div>
                          </div>
                          <div className="h-20 sm:h-32 bg-muted-foreground/10 dark:bg-muted-foreground/20 rounded-xl"></div>
                        </div>
                      </div>
                    </section>
                    
                    {/* Visual Separator */}
                    <div className="w-full h-px from-transparent via-border to-transparent"></div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto px-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-destructive mb-2">
                    Unable to Load Summaries
                  </h2>
                  <p className="text-destructive/80 mb-4">{error}</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && summaries.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto px-4">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Summaries Available
                </h2>
                <p className="text-muted-foreground">
                  High-level summaries will appear here once they are generated.
                </p>
              </div>
            </div>
          )}

          {/* Summaries Content */}
          {!loading && !error && summaries.length > 0 && (
            <>
              {/* Main scrollable content */}
              <div 
                ref={scrollContainerRef}
                className="min-h-screen lg:h-full lg:overflow-y-auto scroll-smooth lg:snap-y lg:snap-mandatory"
              >
                {summaries.map((summary, index) => (
                  <div
                    key={summary.id}
                    className="min-h-screen lg:h-full flex-shrink-0 lg:snap-start"
                  >
                    <SummarySection
                      summary={summary}
                      index={index}
                    />
                  </div>
                ))}
              </div>

              {/* Page Navigation Controls */}
              {summaries.length > 1 && (
                <div className="absolute top-6 right-6 z-10">
                  <div className="flex items-center gap-3">
                    {/* Page indicator */}
                    <span className="text-sm text-muted-foreground font-medium">
                      {currentIndex + 1} of {summaries.length}
                    </span>
                    
                    {/* Navigation arrows */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={navigatePrevious}
                        disabled={currentIndex === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous summary"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={navigateNext}
                        disabled={currentIndex === summaries.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next summary"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
} 