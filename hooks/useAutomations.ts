import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Automation, 
  AutomationContent, 
  CreateAutomationRequest, 
  UpdateAutomationRequest,
  AutomationType
} from '@/types';
import { User } from '@supabase/supabase-js';

interface UseAutomationsReturn {
  automations: (Automation | null)[];
  loading: boolean;
  error: string | null;
  user: User | null;
  createAutomation: (cardNumber: number, params: CreateAutomationRequest['params']) => Promise<void>;
  updateAutomation: (cardNumber: number, params: UpdateAutomationRequest['params']) => Promise<void>;
  deleteAutomation: (cardNumber: number) => Promise<void>;
  refreshAutomations: () => Promise<void>;
  getAutomationContent: (cardNumber: number) => Promise<AutomationContent | null>;
}

// Default automation templates
const DEFAULT_AUTOMATIONS: Omit<CreateAutomationRequest, 'card_number'>[] = [
  {
    type: 'SEMANTIC_SUMMARY',
    params: {
      retrieval_prompt: "Find the most important AI and technology news from today",
      content_prompt: "Summarize the key developments in AI and tech with actionable insights",
      style_prompt: "Write in a clear, professional tone with bullet points for key takeaways",
      name: "Daily Tech News"
    },
    active: true
  },
  {
    type: 'SEMANTIC_SUMMARY',
    params: {
      retrieval_prompt: "Find startup funding and venture capital news",
      content_prompt: "Highlight the most significant funding rounds and their business implications",
      style_prompt: "Focus on market trends and investment patterns with concrete numbers",
      name: "Investment Deals"
    },
    active: true
  },
  {
    type: 'SEMANTIC_SUMMARY',
    params: {
      retrieval_prompt: "Find breaking news in artificial intelligence research and breakthroughs",
      content_prompt: "Explain the latest AI research developments and their potential impact",
      style_prompt: "Use accessible language to explain complex concepts with real-world examples",
      name: "AI Research"
    },
    active: true
  },
  {
    type: 'SEMANTIC_SUMMARY',
    params: {
      retrieval_prompt: "Find news about AI regulation, policy, and government initiatives",
      content_prompt: "Summarize regulatory developments and policy changes affecting AI",
      style_prompt: "Focus on compliance implications and business impact with clear timelines",
      name: "AI Policy"
    },
    active: true
  },
  {
    type: 'SEMANTIC_SUMMARY',
    params: {
      retrieval_prompt: "Find news about big tech companies and their AI strategies",
      content_prompt: "Analyze major tech company moves and strategic decisions in AI",
      style_prompt: "Highlight competitive positioning and market implications with strategic insights",
      name: "Tech Giants"
    },
    active: true
  },
  {
    type: 'SEMANTIC_SUMMARY',
    params: {
      retrieval_prompt: "Find news about AI tools, developer platforms, and open source projects",
      content_prompt: "Cover the latest developer tools and platforms in the AI ecosystem",
      style_prompt: "Write for technical audiences with practical implementation details",
      name: "Developer Tools"
    },
    active: true
  }
];

export function useAutomations(): UseAutomationsReturn {
  const [automations, setAutomations] = useState<(Automation | null)[]>(Array(6).fill(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Track which user we've initialized to prevent re-initialization
  const [initializedUserId, setInitializedUserId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const supabase = createClient();

  // Track user authentication state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      
      if (event === 'SIGNED_OUT') {
        setAutomations(Array(6).fill(null));
        setInitializedUserId(null);
        setIsDemo(true);
        // Load demo automations after sign out
        loadDemoAutomations();
      } else if (event === 'SIGNED_IN' && newUser && initializedUserId !== newUser.id) {
        setIsDemo(false);
        // Only initialize if this is a new user or first sign-in
        initializeUserAutomations(newUser);
      } else if (newUser && !initializedUserId) {
        setIsDemo(false);
        // Handle initial load with existing session
        initializeUserAutomations(newUser);
      } else if (!newUser && !isDemo) {
        // No user and not already in demo mode - load demo
        setIsDemo(true);
        loadDemoAutomations();
      }
    });

    // Get initial user only once on mount
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      if (currentUser && !initializedUserId) {
        setIsDemo(false);
        initializeUserAutomations(currentUser);
      } else if (!currentUser) {
        setIsDemo(true);
        loadDemoAutomations();
      }
    });

    return () => subscription.unsubscribe();
  }, [initializedUserId, isDemo]); // Only depend on initializedUserId and isDemo

  // Load demo automations for non-authenticated users
  const loadDemoAutomations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch demo automations (API will handle demo mode automatically)
      const demoAutomations = await fetchAutomations();
      populateAutomationArray(demoAutomations);
    } catch (err) {
      console.error('Error loading demo automations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load demo automations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize automations for authenticated user
  const initializeUserAutomations = useCallback(async (authenticatedUser: User) => {
    // Don't re-initialize for the same user
    if (initializedUserId === authenticatedUser.id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch existing automations
      const userAutomations = await fetchAutomations();
      
      // If user has no automations, create defaults
      if (userAutomations.length === 0) {
        console.log('[useAutomations] New user, creating default automations');
        await createDefaultAutomations();
        // Fetch again after creating defaults
        const newAutomations = await fetchAutomations();
        populateAutomationArray(newAutomations);
      } else {
        populateAutomationArray(userAutomations);
      }

      // Mark this user as initialized
      setInitializedUserId(authenticatedUser.id);
    } catch (err) {
      console.error('Error initializing user automations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch automations from API (works for both authenticated and demo users)
  const fetchAutomations = async (): Promise<Automation[]> => {
    const response = await fetch('/api/automations', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch automations');
    }
    
    return data.automations || [];
  };

  // Fetch general/default automations for inheritance
  const fetchGeneralAutomations = async (): Promise<Automation[]> => {
    const response = await fetch('/api/automations/general', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch general automations');
    }
    
    return data.automations || [];
  };

  // Create default automations for new user (inherit from general or use hardcoded defaults)
  const createDefaultAutomations = async (): Promise<void> => {
    let automationsToCreate = DEFAULT_AUTOMATIONS;
    
    try {
      // Try to inherit from general/null user automations first
      const generalAutomations = await fetchGeneralAutomations();
      if (generalAutomations.length > 0) {
        automationsToCreate = generalAutomations.map(automation => ({
          type: automation.type,
          params: automation.params,
          active: true
        }));
        console.log('[useAutomations] Inheriting from general automations');
      }
    } catch (error) {
      console.log('[useAutomations] No general automations found, using hardcoded defaults');
    }

    const promises = automationsToCreate.map((automation, index) => 
      fetch('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...automation,
          card_number: index
        }),
      })
    );

    const responses = await Promise.all(promises);
    
    // Check for any failures
    for (const response of responses) {
      if (!response.ok) {
        throw new Error(`Failed to create default automation: HTTP ${response.status}`);
      }
    }
  };

  // Populate automations array with correct positioning
  const populateAutomationArray = (userAutomations: Automation[]) => {
    const newAutomations: (Automation | null)[] = Array(6).fill(null);
    
    userAutomations.forEach(automation => {
      if (automation.card_number >= 0 && automation.card_number < 6) {
        newAutomations[automation.card_number] = automation;
      }
    });
    
    setAutomations(newAutomations);
  };

  // Refresh automations from database (only call this explicitly)
  const refreshAutomations = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      const userAutomations = await fetchAutomations();
      populateAutomationArray(userAutomations);
    } catch (err) {
      console.error('Error refreshing automations:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh automations');
    }
  }, [user]);

  // Create new automation (requires authentication)
  const createAutomation = useCallback(async (
    cardNumber: number, 
    params: CreateAutomationRequest['params']
  ) => {
    if (!user) throw new Error('Please sign in to create automations');
    
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'SEMANTIC_SUMMARY' as AutomationType,
          params,
          card_number: cardNumber,
          active: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create automation');
      }
      
      // Update local state immediately with optimistic update
      const updatedAutomations = [...automations];
      updatedAutomations[cardNumber] = data.automation;
      setAutomations(updatedAutomations);
      
    } catch (error) {
      console.error('Error creating automation:', error);
      throw error;
    }
  }, [user, refreshAutomations]);

  // Update existing automation (requires authentication)
  const updateAutomation = useCallback(async (
    cardNumber: number,
    params: UpdateAutomationRequest['params']
  ) => {
    if (!user) throw new Error('Please sign in to edit automations');
    
    const existingAutomation = automations[cardNumber];
    if (!existingAutomation) {
      // If no automation exists, create one
      await createAutomation(cardNumber, params!);
      return;
    }
    
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'SEMANTIC_SUMMARY' as AutomationType,
          params,
          card_number: cardNumber,
          active: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update automation');
      }
      
      // Update local state immediately with optimistic update
      const updatedAutomations = [...automations];
      updatedAutomations[cardNumber] = data.automation;
      setAutomations(updatedAutomations);
      
    } catch (error) {
      console.error('Error updating automation:', error);
      throw error;
    }
  }, [user, automations, createAutomation, refreshAutomations]);

  // Delete automation (requires authentication)
  const deleteAutomation = useCallback(async (cardNumber: number) => {
    if (!user) throw new Error('Please sign in to delete automations');
    
    const automation = automations[cardNumber];
    if (!automation) return;
    
    try {
      const response = await fetch(`/api/automations/${automation.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete automation');
      }
      
      // Update local state immediately with optimistic update
      const updatedAutomations = [...automations];
      updatedAutomations[cardNumber] = null;
      setAutomations(updatedAutomations);
      
    } catch (error) {
      console.error('Error deleting automation:', error);
      throw error;
    }
  }, [user, automations, refreshAutomations]);

  // Get automation content for a specific card (works for both authenticated and demo users)
  const getAutomationContent = useCallback(async (cardNumber: number): Promise<AutomationContent | null> => {
    try {
      const response = await fetch(`/api/automation-content/${cardNumber}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch automation content');
      }
      
      return data.content;
      
    } catch (error) {
      console.error('Error fetching automation content:', error);
      return null;
    }
  }, []);

  return {
    automations,
    loading,
    error,
    user,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    refreshAutomations,
    getAutomationContent
  };
} 