import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { UserPreferences, PreferenceConflict, ConflictResolution, DatabasePreferences } from '@/types/preferences';
import { 
  PREFERENCES_KEY, 
  DEFAULT_PREFERENCES, 
  mapDatabaseToUser, 
  mapUserToDatabase, 
  detectConflicts, 
  resolveConflicts,
  clearArticleCache,
  isEmpty
} from '@/utils/preferences';
import { User } from '@supabase/supabase-js';

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [conflict, setConflict] = useState<PreferenceConflict | null>(null);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const supabase = createClient();

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

  // Monitor auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      // Handle actual sign-in events (user authentication)
      if (event === 'SIGNED_IN' && newUser && isLoaded) {
        // Add a small delay to ensure server-side session is established
        setTimeout(async () => {
          await handleUserLogin(newUser);
        }, 1000);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [isLoaded]);

  // Handle user login and preference sync (silent - no toasts)
  const handleUserLogin = async (authenticatedUser?: User) => {
    const currentUser = authenticatedUser || user;
    if (!currentUser) {
      console.log('No user found, skipping preference sync');
      return;
    }
    
    try {
      const databasePrefs = await fetchDatabasePreferences();
      const localPrefs = preferences;
      
      if (!databasePrefs) {
        // No database preferences - save local to database
        if (localPrefs) {
          await saveDatabasePreferences(localPrefs);
        } else {
          // No local preferences either - save defaults to database
          await saveDatabasePreferences(DEFAULT_PREFERENCES);
          setPreferences(DEFAULT_PREFERENCES);
          saveToLocalStorage(DEFAULT_PREFERENCES);
        }
        return;
      }

      const dbUserPrefs = mapDatabaseToUser(databasePrefs);
      
      setPreferences(dbUserPrefs);
      saveToLocalStorage(dbUserPrefs);
      return;
      
    } catch (error) {
      console.error('Error syncing preferences:', error);
      // Silent error handling - no toast notifications
    }
  };

  // Fetch preferences from database
  const fetchDatabasePreferences = async (): Promise<DatabasePreferences | null> => {
    try {
      const response = await fetch('/api/preferences', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.preferences : null;
    } catch (error) {
      console.error('Error fetching database preferences:', error);
      throw error;
    }
  };

  // Save preferences to database
  const saveDatabasePreferences = async (userPrefs: UserPreferences): Promise<void> => {
    try {
      const dbPrefs = mapUserToDatabase(userPrefs);
      
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dbPrefs),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving database preferences:', error);
      throw error;
    }
  };

  // Save to localStorage
  const saveToLocalStorage = useCallback((newPreferences: UserPreferences) => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.warn('Error saving preferences to localStorage:', error);
    }
  }, []);

  // Save preferences (main function used by UI)
  const savePreferences = useCallback(async (newPreferences: UserPreferences) => {
    try {
      console.log('savePreferences called with:', newPreferences);
      
      // Always save to localStorage first
      console.log('Saving to localStorage...');
      saveToLocalStorage(newPreferences);
      setPreferences(newPreferences);
      console.log('localStorage and state updated');
      
      // Save to database if user is authenticated
      if (user) {
        console.log('User authenticated, saving to database...');
        await saveDatabasePreferences(newPreferences);
        console.log('Database save completed');
      } else {
        console.log('No user authenticated, saving only to localStorage');
      }
      
      // Clear cache to trigger refresh
      clearArticleCache();
      
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Revert preferences on error
      const saved = localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        const revertedPrefs = JSON.parse(saved);
        setPreferences(revertedPrefs);
      }
      throw error;
    }
  }, [user, saveToLocalStorage]);

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
    return preferences?.contentInterests || DEFAULT_PREFERENCES.contentInterests;
  }, [preferences]);

  // Get the effective presentation style (user preference or default)
  const getPresentationStyle = useCallback(() => {
    return preferences?.presentationStyle || DEFAULT_PREFERENCES.presentationStyle;
  }, [preferences]);

  // Check if preferences are set
  const hasPreferences = useCallback(() => {
    return Boolean(preferences);
  }, [preferences]);

  return {
    preferences,
    isLoaded,
    user,
    savePreferences,
    clearPreferences,
    getContentInterests,
    getPresentationStyle,
    hasPreferences,
    defaultPreferences: DEFAULT_PREFERENCES,
  };
} 