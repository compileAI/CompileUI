"use client";

import { NavigationDropdown } from "./ui/navigation-dropdown";
import { Settings } from "lucide-react";
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

interface PreferenceFormData {
  preference: string;
}

interface DemoHeaderProps {
  showSettings?: boolean;
  showHome?: boolean;
  onPreferenceChange?: (preference: string) => void;
}

export default function DemoHeader({ 
  showSettings = true, 
  showHome = true,
  onPreferenceChange 
}: DemoHeaderProps) {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState<string | null>(null);
  const [isViewingPreferences, setIsViewingPreferences] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

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

  return (
    <div className="sticky border-b border-zinc-200 dark:border-zinc-800 top-0 z-50 bg-white dark:bg-zinc-900 py-4 lg:px-8 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Compile.</h1>
          <NavigationDropdown showHome={showHome} />
        </div>
        {showSettings && (
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
        )}
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