"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { HlcArticle } from "@/types";
import SummarySection from "./SummarySection";
import Header from "./Header";
import { Button } from "./ui/button";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";

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
          console.log(`[SummariesClient] Loaded ${data.summaries.length} summaries:`, data.summaries);
          
          // Log article counts for each summary
          data.summaries.forEach((summary: HlcArticle, index: number) => {
            console.log(`[SummariesClient] Summary ${index + 1} "${summary.title}": ${summary.articles?.length || 0} articles`, summary.articles);
          });
          
          setSummaries(data.summaries);
        } else {
          throw new Error('No summaries data received');
        }
      } catch (err) {
        console.error('[SummariesClient] Error fetching summaries:', err);
        setError(err instanceof Error ? err.message : 'Failed to load summaries');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, []);

  // Handle scroll to specific section
  const scrollToSection = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    // Each section is calc(100vh-4rem) plus separator, so calculate actual position
    const sectionHeight = window.innerHeight - 64; // 4rem = 64px
    const separatorHeight = 1; // 1px separator
    const targetScrollTop = index * (sectionHeight + separatorHeight);
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
    
    setCurrentIndex(index);
  }, []);

  // Handle previous/next navigation
  const navigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      scrollToSection(currentIndex - 1);
    }
  }, [currentIndex, scrollToSection]);

  const navigateNext = useCallback(() => {
    if (currentIndex < summaries.length - 1) {
      scrollToSection(currentIndex + 1);
    }
  }, [currentIndex, summaries.length, scrollToSection]);

  // Handle scroll events to update current index and progress dots
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || summaries.length === 0) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      // Calculate which section we're closest to based on scroll position
      const sectionHeight = window.innerHeight - 64; // 4rem = 64px
      const separatorHeight = 1; // 1px separator
      const totalSectionHeight = sectionHeight + separatorHeight;
      const newIndex = Math.floor(scrollTop / totalSectionHeight);
      
      // Clamp the index to valid range
      const clampedIndex = Math.max(0, Math.min(newIndex, summaries.length - 1));
      
      if (clampedIndex !== currentIndex) {
        setCurrentIndex(clampedIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [summaries.length, currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigatePrevious();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrevious]);

  return (
    <>
      <Header />
      
      <div className="relative h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-lg font-medium text-foreground">Loading summaries...</p>
            </div>
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

        {/* Main Content */}
        {!loading && !error && summaries.length > 0 && (
          <>
            {/* Vertical Scroll Container - Desktop */}
            <div 
              ref={scrollContainerRef}
              className="hidden lg:block h-full overflow-y-auto overflow-x-hidden scroll-smooth"
            >
              {summaries.map((summary, index) => (
                <SummarySection
                  key={summary.id}
                  summary={summary}
                  index={index}
                />
              ))}
            </div>

            {/* Vertical Scroll Container - Mobile */}
            <div className="lg:hidden h-full overflow-y-auto">
              <div className="pb-8">
                {summaries.map((summary, index) => (
                  <div key={summary.id}>
                    <SummarySection summary={summary} index={index} />
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Controls - Desktop Only */}
            <div className="hidden lg:block">
              {/* Progress Indicators with Navigation Arrows - Left Side */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
                <div className="flex flex-col items-center gap-4">
                  {/* Previous Button (Up) */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-background/80 backdrop-blur-sm"
                    onClick={navigatePrevious}
                    disabled={currentIndex === 0}
                    aria-label="Previous summary"
                  >
                    <ChevronUp className="h-5 w-5" />
                  </Button>

                  {/* Progress Indicators */}
                  <div className="flex flex-col items-center gap-3 bg-background/80 backdrop-blur-sm rounded-full px-2 py-4">
                    {summaries.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          index === currentIndex 
                            ? 'bg-primary h-6' 
                            : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                        }`}
                        onClick={() => scrollToSection(index)}
                        aria-label={`Go to summary ${index + 1}`}
                      />
                    ))}
                  </div>

                  {/* Next Button (Down) */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-background/80 backdrop-blur-sm"
                    onClick={navigateNext}
                    disabled={currentIndex === summaries.length - 1}
                    aria-label="Next summary"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Summary Counter */}
              <div className="absolute top-6 left-6 z-10">
                <div className="bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-muted-foreground">
                  {currentIndex + 1} / {summaries.length}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
} 