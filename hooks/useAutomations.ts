import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Automation, 
  AutomationWithContent,
  AutomationContent, 
  CreateAutomationRequest, 
  UpdateAutomationRequest,
  AutomationType
} from '@/types';
import { useAuth } from '@/context/AuthContext';

interface UseAutomationsReturn {
  automations: (AutomationWithContent | null)[];
  loading: boolean;
  error: string | null;
  user: any; // Auth0 user object
  createAutomation: (cardNumber: number, params: CreateAutomationRequest['params']) => Promise<void>;
  updateAutomation: (cardNumber: number, params: UpdateAutomationRequest['params']) => Promise<void>;
  deleteAutomation: (cardNumber: number) => Promise<void>;
  refreshAutomations: () => Promise<void>;
  // getAutomationContent is no longer needed since content is embedded
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

// Global state to prevent multiple hook instances from making duplicate API calls
let globalAutomationsState = {
  automations: Array(6).fill(null) as (AutomationWithContent | null)[],
  loading: true,
  error: null as string | null,
  user: null as any, // Auth0 user object
  initializedUserId: null as string | null,
  isDemo: false,
  isInitializing: false, // Prevent concurrent initialization
  subscribers: new Set<Function>()
};

function notifySubscribers() {
  globalAutomationsState.subscribers.forEach(callback => callback());
}

export function useAutomations(): UseAutomationsReturn {
  const [, forceUpdate] = useState({});
  const forceRender = useCallback(() => forceUpdate({}), []);
  
  // Use Auth0 authentication from context
  const { user: auth0User, isLoading } = useAuth();
  
  // Subscribe to global state changes
  useEffect(() => {
    globalAutomationsState.subscribers.add(forceRender);
    return () => {
      globalAutomationsState.subscribers.delete(forceRender);
    };
  }, [forceRender]);

  // Track Auth0 authentication state changes
  useEffect(() => {
    // Don't do anything while Auth0 is still loading
    if (isLoading) return;

    // If already initializing, don't start another initialization
    if (globalAutomationsState.isInitializing) {
      return;
    }

    const currentUserId = auth0User?.sub;
    globalAutomationsState.user = auth0User;

    // Handle sign out (user was authenticated, now not)
    if (!auth0User && globalAutomationsState.initializedUserId) {
      globalAutomationsState.automations = Array(6).fill(null);
      globalAutomationsState.initializedUserId = null;
      globalAutomationsState.isDemo = true;
      notifySubscribers();
      loadDemoAutomations();
      return;
    }

    // Handle sign in (user is authenticated and we haven't initialized for this user)
    if (auth0User && globalAutomationsState.initializedUserId !== currentUserId) {
      globalAutomationsState.isDemo = false;
      notifySubscribers();
      initializeUserAutomations(auth0User);
      return;
    }

    // Handle initial load for unauthenticated users
    if (!auth0User && !globalAutomationsState.isDemo && !globalAutomationsState.initializedUserId) {
      globalAutomationsState.isDemo = true;
      notifySubscribers();
      loadDemoAutomations();
      return;
    }

  }, [auth0User, isLoading]); // React to Auth0 user changes

  // Populate automations array with correct positioning (now includes content)
  const populateAutomationArray = useCallback((userAutomations: AutomationWithContent[]) => {
    const newAutomations: (AutomationWithContent | null)[] = Array(6).fill(null);
    
    userAutomations.forEach(automation => {
      if (automation.card_number >= 0 && automation.card_number < 6) {
        newAutomations[automation.card_number] = automation;
      }
    });
    
    globalAutomationsState.automations = newAutomations;
    notifySubscribers();
  }, []);

  // Fetch automations from API (now includes content for each automation)
  const fetchAutomations = useCallback(async (): Promise<AutomationWithContent[]> => {
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
  }, []);

  // Load demo automations for non-authenticated users
  const loadDemoAutomations = useCallback(async () => {
    try {
      globalAutomationsState.loading = true;
      globalAutomationsState.error = null;
      notifySubscribers();

      // Fetch demo automations (API will handle demo mode automatically)
      const demoAutomations = await fetchAutomations();
      populateAutomationArray(demoAutomations);
    } catch (err) {
      console.error('Error loading demo automations:', err);
      globalAutomationsState.error = err instanceof Error ? err.message : 'Failed to load demo automations';
      notifySubscribers();
    } finally {
      globalAutomationsState.loading = false;
      notifySubscribers();
    }
  }, [fetchAutomations, populateAutomationArray]);

  // Initialize automations for authenticated user
  const initializeUserAutomations = useCallback(async (authenticatedUser: any) => {
    // Don't re-initialize for the same user (Auth0 uses 'sub' as user ID)
    if (globalAutomationsState.initializedUserId === authenticatedUser.sub) {
      return;
    }

    try {
      globalAutomationsState.loading = true;
      globalAutomationsState.error = null;
      notifySubscribers();

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

      // Mark this user as initialized (Auth0 uses 'sub' as user ID)
      globalAutomationsState.initializedUserId = authenticatedUser.sub;
      notifySubscribers();
    } catch (err) {
      console.error('Error initializing user automations:', err);
      globalAutomationsState.error = err instanceof Error ? err.message : 'Failed to load automations';
      notifySubscribers();
    } finally {
      globalAutomationsState.loading = false;
      notifySubscribers();
    }
  }, [fetchAutomations, populateAutomationArray]);



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



  // Refresh automations from database (only call this explicitly)
  const refreshAutomations = useCallback(async () => {
    if (!globalAutomationsState.user) return;
    
    try {
      globalAutomationsState.error = null;
      notifySubscribers();
      const userAutomations = await fetchAutomations();
      populateAutomationArray(userAutomations);
    } catch (err) {
      console.error('Error refreshing automations:', err);
      globalAutomationsState.error = err instanceof Error ? err.message : 'Failed to refresh automations';
      notifySubscribers();
    }
  }, [fetchAutomations, populateAutomationArray]);

  // Create new automation (requires authentication)
  const createAutomation = useCallback(async (
    cardNumber: number, 
    params: CreateAutomationRequest['params']
  ) => {
    if (!globalAutomationsState.user) throw new Error('Please sign in to create automations');
    
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
      
      // Update global state immediately with optimistic update
      const updatedAutomations = [...globalAutomationsState.automations];
      updatedAutomations[cardNumber] = data.automation;
      globalAutomationsState.automations = updatedAutomations;
      notifySubscribers();
      
    } catch (error) {
      console.error('Error creating automation:', error);
      throw error;
    }
  }, [refreshAutomations]);

  // Update existing automation (requires authentication)
  const updateAutomation = useCallback(async (
    cardNumber: number,
    params: UpdateAutomationRequest['params']
  ) => {
    if (!globalAutomationsState.user) throw new Error('Please sign in to edit automations');
    
    const existingAutomation = globalAutomationsState.automations[cardNumber];
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
      
      // Update global state immediately with optimistic update
      const updatedAutomations = [...globalAutomationsState.automations];
      updatedAutomations[cardNumber] = data.automation;
      globalAutomationsState.automations = updatedAutomations;
      notifySubscribers();
      
    } catch (error) {
      console.error('Error updating automation:', error);
      throw error;
    }
  }, [createAutomation, refreshAutomations]);

  // Delete automation (requires authentication)
  const deleteAutomation = useCallback(async (cardNumber: number) => {
    if (!globalAutomationsState.user) throw new Error('Please sign in to delete automations');
    
    const automation = globalAutomationsState.automations[cardNumber];
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
      
      // Update global state immediately with optimistic update
      const updatedAutomations = [...globalAutomationsState.automations];
      updatedAutomations[cardNumber] = null;
      globalAutomationsState.automations = updatedAutomations;
      notifySubscribers();
      
    } catch (error) {
      console.error('Error deleting automation:', error);
      throw error;
    }
  }, [refreshAutomations]);

  return {
    automations: globalAutomationsState.automations,
    loading: globalAutomationsState.loading,
    error: globalAutomationsState.error,
    user: globalAutomationsState.user,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    refreshAutomations
  };
} 