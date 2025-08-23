"use client";

import { Search, Loader2, ChevronDown, Menu, Home, Compass, FileText, Moon, Sun } from "lucide-react";
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
import { useNavigation } from "@/hooks/useNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import AuthForm from "@/components/Forms/AuthForm";
import { ThemeToggle } from "./ui/theme-toggle";
import { User } from "lucide-react";
import { useTheme } from "next-themes";
import { useUser } from '@auth0/nextjs-auth0';

export default function Header() {
  const pathname = usePathname();
  const { isNavigating, navigateTo, clearNavigation } = useNavigation();
  const { user } = useUser(); // Auth0 user
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Clear navigation state when route changes
  useEffect(() => {
    clearNavigation();
  }, [pathname, clearNavigation]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const header = document.getElementById('mobile-header');
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
    if (pathname === "/summaries") return "Summaries";
    return "Home"; // Default to Home for any other page
  };

  const navigationItems = [
    { 
      label: "Home", 
      path: "/home", 
      icon: Home, 
      message: "Loading your personalized feed..." 
    },
    { 
      label: "Discover", 
      path: "/discover", 
      icon: Compass, 
      message: "Loading articles..." 
    },
    { 
      label: "Summaries", 
      path: "/summaries", 
      icon: FileText, 
      message: "Loading summaries..." 
    }
  ];

  const isDark = mounted ? theme === "dark" : false;

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-card border-r border-border flex-col z-50">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <button 
            onClick={() => navigateTo("/home", "Loading your personalized feed...")}
            className="text-3xl px-2 font-bold tracking-tight hover:text-primary transition-colors cursor-pointer"
          >
            Compile.
          </button>
        </div>

        {/* Search - Right below logo */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search..."
              className="text-sm pr-8 h-10 rounded-xl"
              disabled={isLoading}
            />
            <Button 
              onClick={() => handleSearch()} 
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-0 top-0 h-10 w-10 p-0 rounded-xl"
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

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-2 space-y-2">
          {navigationItems.map(({ label, path, icon: Icon, message }) => (
            <Button
              key={path}
              variant={pathname === path ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 h-10"
              onClick={() => navigateTo(path, message)}
              disabled={isNavigating}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Bottom Section - Theme Toggle and Auth */}
        <div className="p-4 border-t border-border">
          {/* Theme Toggle - Full Width */}
          <Button
            variant="ghost"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-full justify-start gap-3 h-10"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {isDark ? "Light Mode" : "Dark Mode"}
          </Button>

          {/* Auth Section */}
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-muted/50 transition-colors">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  {user.picture ? (
                    <AvatarImage src={user.picture} alt={user.email} />
                  ) : (
                    <AvatarFallback className="text-xs">{user.email?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  window.location.href = '/auth/logout';
                }}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                window.location.href = '/auth/login';
              }}
            >
              <User className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Header - Hidden on desktop */}
      <div id="mobile-header" className="md:hidden sticky border-b border-border top-0 z-50 bg-card py-3 px-4">
        <div className="flex flex-col gap-3">
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
                  <DropdownMenuItem onClick={() => navigateTo("/summaries", "Loading summaries...")}>
                    Summaries
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
                  <DropdownMenuSeparator />
                  {user ? (
                    <>
                      <div className="px-2 py-1.5 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {user.picture ? (
                            <AvatarImage src={user.picture} alt={user.email} />
                          ) : (
                            <AvatarFallback className="text-xs">{user.email?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-sm truncate">{user.email}</span>
                      </div>
                      <DropdownMenuItem
                        onClick={() => {
                          window.location.href = '/auth/logout';
                        }}
                      >
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => {
                        window.location.href = '/auth/login';
                      }}>
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
      </div>

      {/* Auth Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Up / Sign In</DialogTitle>
          </DialogHeader>
          <AuthForm />
        </DialogContent>
      </Dialog>


    </>
  );
} 