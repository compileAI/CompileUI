import { useState, useEffect, useCallback } from "react";

const PREFERENCES_KEY = "compile-user-preferences";

// Default preferences with examples
const DEFAULT_CONTENT_INTERESTS = "News about AI models, deals, investments, discourse and all other information";
const DEFAULT_PRESENTATION_STYLE = "Summarize the key points in a clear, concise manner with actionable insights";

interface UserPreferences {
  contentInterests: string;
  presentationStyle: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  contentInterests: DEFAULT_CONTENT_INTERESTS,
  presentationStyle: DEFAULT_PRESENTATION_STYLE
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        const parsedPreferences = JSON.parse(saved);
        setPreferences(parsedPreferences);
      }
      setIsLoaded(true);
    } catch (error) {
      console.warn('Error loading preferences from localStorage:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: UserPreferences) => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.warn('Error saving preferences to localStorage:', error);
    }
  }, []);

  // Clear preferences
  const clearPreferences = useCallback(() => {
    try {
      localStorage.removeItem(PREFERENCES_KEY);
      setPreferences(null);
    } catch (error) {
      console.warn('Error clearing preferences from localStorage:', error);
    }
  }, []);

  // Get the effective content interests (user preference or default)
  const getContentInterests = useCallback(() => {
    return preferences?.contentInterests || DEFAULT_CONTENT_INTERESTS;
  }, [preferences]);

  // Get the effective presentation style (user preference or default)
  const getPresentationStyle = useCallback(() => {
    return preferences?.presentationStyle || DEFAULT_PRESENTATION_STYLE;
  }, [preferences]);

  // Check if preferences are set
  const hasPreferences = useCallback(() => {
    return Boolean(preferences);
  }, [preferences]);

  return {
    preferences,
    isLoaded,
    savePreferences,
    clearPreferences,
    getContentInterests,
    getPresentationStyle,
    hasPreferences,
    defaultPreferences: DEFAULT_PREFERENCES
  };
} 