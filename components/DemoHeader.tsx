"use client";

import { Settings, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/hooks/usePreferences";

interface PreferenceFormData {
  contentInterests: string;
  presentationStyle: string;
}

// Helper function to check if cache exists
const getCacheStatus = () => {
  try {
    const cached = localStorage.getItem("compile-enhanced-articles");
    if (!cached) return null;
    
    const cachedData = JSON.parse(cached);
    const isExpired = Date.now() > cachedData.expiresAt;
    
    if (isExpired) {
      localStorage.removeItem("compile-enhanced-articles");
      return null;
    }
    
    return {
      contentInterests: cachedData.contentInterests,
      presentationStyle: cachedData.presentationStyle,
      articleCount: cachedData.articles.length,
      timestamp: cachedData.timestamp
    };
  } catch {
    return null;
  }
};

export default function DemoHeader() {
  const router = useRouter();
  const { preferences, savePreferences, hasPreferences } = usePreferences();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Track when component has mounted to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<PreferenceFormData>({
    defaultValues: {
      contentInterests: preferences?.contentInterests || "",
      presentationStyle: preferences?.presentationStyle || "",
    },
  });

  // Only get cache status after component has mounted
  const cacheStatus = isMounted ? getCacheStatus() : null;

  const handleSettingsClick = () => {
    setIsPreferencesOpen(true);
    // Reset form with current preferences
    form.reset({
      contentInterests: preferences?.contentInterests || "",
      presentationStyle: preferences?.presentationStyle || "",
    });
  };

  const onSubmit = (data: PreferenceFormData) => {
    savePreferences({
      contentInterests: data.contentInterests,
      presentationStyle: data.presentationStyle,
    });
    setShowSavedMessage(true);
    
    // Clear cache when preferences change
    localStorage.removeItem("compile-enhanced-articles");
    
    // Hide the saved message after 2 seconds
    setTimeout(() => {
      setShowSavedMessage(false);
      setIsPreferencesOpen(false);
    }, 2000);
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      // Navigate to discover page with search results
      router.push(`/demo/discover?search=${encodeURIComponent(searchTerm)}`);
    } catch (error) {
      console.error('Error navigating to discover page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="sticky border-b border-zinc-200 dark:border-zinc-800 top-0 z-50 bg-white dark:bg-zinc-900 py-3 lg:px-8 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/demo/home")}
            className="text-3xl font-bold tracking-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            Compile.
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/demo/home")}
              className="h-8"
            >
              Home
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/demo/discover")}
              className="h-8"
            >
              Discover
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search..."
              className="h-8 text-sm pr-8"
              disabled={isLoading}
            />
            <Button 
              onClick={() => handleSearch()} 
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-0 top-0 h-8 w-8 p-0"
              variant="ghost"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* No preferences notification - only show after mount */}
          {isMounted && !hasPreferences() && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                Set preferences →
              </span>
            </div>
          )}

          {/* Cache status indicator - only show after mount */}
          {isMounted && cacheStatus && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                Cached ({cacheStatus.articleCount})
              </span>
            </div>
          )}
          
          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSettingsClick}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all ${
              isMounted && !hasPreferences() ? 'ring-2 ring-blue-500 ring-opacity-50 animate-pulse bg-blue-50 dark:bg-blue-950/20' : ''
            }`}
          >
            <Settings className={`h-5 w-5 ${
              isMounted && !hasPreferences() ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
            }`} />
          </Button>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Customize Your Experience</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Content Interests Section */}
            <div className="space-y-3">
              <Label htmlFor="contentInterests" className="text-base font-medium">
                What content are you interested in?
              </Label>
              <textarea
                id="contentInterests"
                {...form.register("contentInterests")}
                placeholder="e.g., AI and machine learning developments, startup funding news, tech industry analysis..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                autoFocus
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This determines which articles are selected for you from our database.
              </p>
            </div>

            {/* Presentation Style Section */}
            <div className="space-y-3">
              <Label htmlFor="presentationStyle" className="text-base font-medium">
                How would you like the content to be presented?
              </Label>
              <textarea
                id="presentationStyle"
                {...form.register("presentationStyle")}
                placeholder="e.g., Focus on key takeaways and business implications, write in a casual conversational tone, highlight actionable insights..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This customizes how articles are enhanced and summarized for you.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Save Preferences
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsPreferencesOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>

            {/* Success Message */}
            {showSavedMessage && (
              <div className="text-center">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Preferences saved successfully! Your homepage will refresh with new content.
                </p>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 