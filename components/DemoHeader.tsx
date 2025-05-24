"use client";

import { Settings, Search, Loader2 } from "lucide-react";
import { Article } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

interface PreferenceFormData {
  preference: string;
}

interface DemoHeaderProps {
  onPreferenceChange?: (preference: string) => void;
  onSearchResults?: (articles: Article[]) => void;
}

export default function DemoHeader({ 
  onPreferenceChange,
  onSearchResults
}: DemoHeaderProps) {
  const router = useRouter();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState<string | null>(null);
  const [isViewingPreferences, setIsViewingPreferences] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PreferenceFormData>({
    defaultValues: {
      preference: "",
    },
  });

  const handlePreferencesClick = () => {
    setIsDropdownOpen(false);
    setIsPreferencesOpen(true);
    setIsViewingPreferences(false);
  };

  const handleViewPreferences = () => {
    setIsDropdownOpen(false);
    setIsViewingPreferences(true);
  };

  const onSubmit = (data: PreferenceFormData) => {
    setSavedPreferences(data.preference);
    onPreferenceChange?.(data.preference);
    setShowSavedMessage(true);
    form.reset();
    
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
      const response = await fetch('/api/vector-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchTerm,
          limit: 20
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Navigate to discover page with search results
      router.push(`/demo/discover?search=${encodeURIComponent(searchTerm)}`);
    } catch (error) {
      console.error('Error performing vector search:', error);
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
    <div className="sticky border-b border-zinc-200 dark:border-zinc-800 top-0 z-50 bg-white dark:bg-zinc-900 py-4 lg:px-8 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Compile.</h1>
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
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <Settings className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewPreferences}>View Preferences</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePreferencesClick}>
                Set Preferences
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Set Preferences Dialog */}
      <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Preferences</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="py-4 space-y-4">
              <Input
                {...form.register("preference")}
                placeholder="What are you interested in seeing?"
                autoFocus
              />
              {showSavedMessage && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Preferences saved successfully!
                </p>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Preferences Dialog */}
      <Dialog open={isViewingPreferences} onOpenChange={setIsViewingPreferences}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Current Preferences</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {savedPreferences ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">{savedPreferences}</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No preferences set yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 