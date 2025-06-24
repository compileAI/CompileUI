"use client";

import { Settings, Search, Loader2, RefreshCw } from "lucide-react";
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
import { usePathname } from "next/navigation";
import { usePreferences } from "@/hooks/usePreferences";
import { useNavigation } from "@/hooks/useNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import AuthForm from "@/components/Forms/AuthForm";
import { createClient } from "@/utils/supabase/client";
import PreferenceConflictDialog from "@/components/PreferenceConflictDialog";
import LoadingOverlay from "./ui/loading-overlay";
import toast, { Toaster } from 'react-hot-toast';

interface PreferenceFormData {
  contentInterests: string;
  presentationStyle: string;
}

interface CacheStatus {
  contentInterests: string;
  presentationStyle: string;
  articleCount: number;
  timestamp: number;
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

export default function Header() {
  const pathname = usePathname();
  const supabase = createClient();
  const { isNavigating, destination, navigateTo, clearNavigation } = useNavigation();
  const { 
    preferences, 
    savePreferences, 
    hasPreferences, 
    user,
    conflict,
    isConflictDialogOpen,
    resolveConflict
  } = usePreferences();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Track when component has mounted to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCacheStatus(getCacheStatus());
  }, [isMounted]);

  // Clear navigation state when route changes
  useEffect(() => {
    clearNavigation();
  }, [pathname, clearNavigation]);

  // Listen for cache updates from useHomeSearch
  useEffect(() => {
    const handleCacheUpdate = () => {
      setCacheStatus(getCacheStatus());
    };

    window.addEventListener('cacheUpdated', handleCacheUpdate);
    
    return () => {
      window.removeEventListener('cacheUpdated', handleCacheUpdate);
    };
  }, []);

  const form = useForm<PreferenceFormData>({
    defaultValues: {
      contentInterests: preferences?.contentInterests || "",
      presentationStyle: preferences?.presentationStyle || "",
    },
  });

  // Update form when preferences change
  useEffect(() => {
    form.reset({
      contentInterests: preferences?.contentInterests || "",
      presentationStyle: preferences?.presentationStyle || "",
    });
  }, [preferences, form]);

  const handleSettingsClick = () => {
    setIsPreferencesOpen(true);
    // Reset form with current preferences
    form.reset({
      contentInterests: preferences?.contentInterests || "",
      presentationStyle: preferences?.presentationStyle || "",
    });
  };

  const onSubmit = async (data: PreferenceFormData) => {
    try {
      toast.loading('Saving preferences...', { id: 'save' });
      
      await savePreferences({
        contentInterests: data.contentInterests,
        presentationStyle: data.presentationStyle,
      });
      
      toast.success('Preferences saved successfully!', { id: 'save' });
      setShowSavedMessage(true);
      
      // Hide the saved message and close modal after 2 seconds
      setTimeout(() => {
        setShowSavedMessage(false);
        setIsPreferencesOpen(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.', { id: 'save' });
    }
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      // Navigate to discover page with search query - DiscoverClient will handle vector search
      await navigateTo(`/discover?search=${encodeURIComponent(searchTerm)}`, 'Searching...');
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
    <>
      {/* Toast Container */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#000000',
            border: '1px solid #e5e7eb',
            opacity: 1,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        }}
      />
      
      <div className="sticky border-b border-border top-0 z-50 bg-card py-3 lg:px-8 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigateTo("/home", "Loading your personalized feed...")}
              className="text-3xl font-bold tracking-tight hover:text-primary transition-colors cursor-pointer"
            >
              Compile.
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigateTo("/home", "Loading your personalized feed...")}
                className={`h-8 hover:bg-gray-200 ${pathname === "/home" ? "bg-gray-200" : ""}`}
                disabled={isNavigating}
              >
                Home
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateTo("/discover", "Loading articles...")}
                className={`h-8 hover:bg-gray-200 ${pathname === "/discover" ? "bg-gray-200" : ""}`}
                disabled={isNavigating}
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
                onKeyDown={handleKeyPress}
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
          

            {/* Cache status indicator - only show after mount */}
            {isMounted && cacheStatus && (
              <div className="flex items-center gap-2 bg-accent/50 border border-accent rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 bg-accent-foreground rounded-full"></div>
                <span className="text-xs text-accent-foreground font-medium">
                  Cached ({cacheStatus.articleCount})
                </span>
              </div>
            )}
            
            {/* Clear Cache Button */}
            {isMounted && cacheStatus && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("compile-enhanced-articles");
                  // Dispatch event to update cache status immediately
                  window.dispatchEvent(new CustomEvent('cacheUpdated', { detail: null }));
                  window.location.reload();
                }}
                className="p-2 hover:bg-muted rounded-md transition-all"
                title="Clear cache and refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {/* No preferences notification - only show after mount */}
            {isMounted && !hasPreferences() && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-xs text-primary font-medium">
                  Set preferences →
                </span>
              </div>
            )}

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              className={`p-2 hover:bg-muted rounded-md transition-all ${
                isMounted && !hasPreferences() ? 'bg-primary/10 border border-primary/20' : ''
              }`}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <Avatar>
                  {user.user_metadata?.avatar_url ? (
                    <AvatarImage src={user.user_metadata.avatar_url} alt={user.email} />
                  ) : (
                    <AvatarFallback>{user.email?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                  )}
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setAuthModalOpen(true)}
              >
                Sign In
              </Button>
            )}
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
                <p className="text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm text-primary font-medium">
                    ✓ Preferences saved successfully! Your homepage will refresh with new content.
                  </p>
                </div>
              )}
            </form>
          </DialogContent>
        </Dialog>

        {/* Auth Modal */}
        <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sign Up / Sign In</DialogTitle>
            </DialogHeader>
            <AuthForm />
          </DialogContent>
        </Dialog>

        {/* Conflict Resolution Dialog */}
        {conflict && (
          <PreferenceConflictDialog
            open={isConflictDialogOpen}
            conflict={conflict}
            onResolve={resolveConflict}
          />
        )}
      </div>

      {/* Navigation Loading Overlay */}
      <LoadingOverlay 
        isVisible={isNavigating} 
        message={
          isNavigating 
            ? (destination === "/home" ? "Loading your personalized feed..." : "Loading articles...")
            : undefined
        } 
      />
    </>
  );
} 