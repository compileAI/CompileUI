"use client";

import { Settings, Search, Loader2, ChevronDown, Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/hooks/usePreferences";
import { useNavigation } from "@/hooks/useNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import AuthForm from "@/components/Forms/AuthForm";
import { createClient } from "@/utils/supabase/client";
import LoadingOverlay from "./ui/loading-overlay";
import PreferenceForm from "@/components/PreferenceForm";
import { ThemeToggle } from "./ui/theme-toggle";
import { User } from "lucide-react";


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
    user
  } = usePreferences();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
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

  const handleSettingsClick = () => {
    setIsPreferencesOpen(true);
  };

  useEffect(() => {
    const header = document.getElementById('full-header');
    if (header) {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }
    const handleResize = () => {
      if (header) {
        document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSavePreferences = async (preferences: { contentInterests: string; presentationStyle: string }) => {
    console.log('Header handleSavePreferences called with:', preferences);
    await savePreferences(preferences);
    console.log('Header preferences saved successfully');
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      // Add timestamp to ensure navigation triggers even for same search terms
      // This forces the URL to be different and ensures search is re-executed
      const timestamp = Date.now();
      await navigateTo(`/discover?search=${encodeURIComponent(searchTerm)}&t=${timestamp}`, 'Searching...');
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

  // Get current page label for mobile navigation dropdown
  const getCurrentPageLabel = () => {
    if (pathname === "/discover") return "Discover";
    return "Home"; // Default to Home for any other page
  };



  return (
    <>
      <div id="full-header" className="sticky border-b border-border top-0 z-50 bg-card py-3 lg:px-8 px-4">
        {/* Desktop Layout - Hidden on mobile */}
        <div className="hidden md:flex items-center justify-between">
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
            {/* Desktop Search */}
            <div className="relative w-64">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Search..."
                className="text-sm pr-8 h-8"
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

            {/* Cache status indicator - only show after mount and on desktop */}
            {isMounted && cacheStatus && (
              <div className="flex items-center gap-2 bg-accent/50 border border-accent rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 bg-accent-foreground rounded-full"></div>
                <span className="text-xs text-accent-foreground font-medium">
                  Cached ({cacheStatus.articleCount})
                </span>
              </div>
            )}
            


            {/* No preferences notification - only show after mount and on desktop */}
            {isMounted && !hasPreferences() && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-xs text-primary font-medium">
                  Set preferences →
                </span>
              </div>
            )}

            {/* Theme Toggle Button */}
            <ThemeToggle />

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

        {/* Mobile Layout - Hidden on desktop */}
        <div className="flex md:hidden flex-col gap-3">
          {/* Top Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigateTo("/home", "Loading your personalized feed...")}
                className="text-2xl font-bold tracking-tight hover:text-primary transition-colors cursor-pointer"
              >
                Compile.
              </button>
              
              {/* Navigation Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    {getCurrentPageLabel()}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => navigateTo("/home", "Loading your personalized feed...")}>
                    Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo("/discover", "Loading articles...")}>
                    Discover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Settings/Auth Dropdown */}
            <div className="flex flex-row items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {user ? (
                    <>
                      <div className="px-2 py-1.5 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {user.user_metadata?.avatar_url ? (
                            <AvatarImage src={user.user_metadata.avatar_url} alt={user.email} />
                          ) : (
                            <AvatarFallback className="text-xs">{user.email?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-sm truncate">{user.email}</span>
                      </div>
                      <DropdownMenuItem
                        onClick={async () => {
                          await supabase.auth.signOut();
                          window.location.reload();
                        }}
                      >
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => setAuthModalOpen(true)}>
                        <User className="h-4 w-4 mr-2" />
                        Sign In
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom Row - Search */}
          <div className="relative w-full">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search..."
              className="text-sm pr-8 h-10"
              disabled={isLoading}
            />
            <Button 
              onClick={() => handleSearch()} 
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-0 top-0 h-10 w-10 p-0"
              variant="ghost"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Preference Form */}
        <PreferenceForm
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
          onSave={handleSavePreferences}
          initialPreferences={preferences || undefined}
        />

        {/* Auth Modal */}
        <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sign Up / Sign In</DialogTitle>
            </DialogHeader>
            <AuthForm />
          </DialogContent>
        </Dialog>
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