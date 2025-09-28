"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutomations } from "@/hooks/useAutomations";
import AutomationForm from "./AutomationForm";
import Header from "./Header";
import toast from 'react-hot-toast';
import MarkdownWithLatex from "@/components/ui/markdown-with-latex";


interface AutomationPageProps {
  cardNumber: number;
}

export default function AutomationPage({ cardNumber }: AutomationPageProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  // Content is now embedded in the automation object
  const [automationName, setAutomationName] = useState("");
  const [originalAutomationName, setOriginalAutomationName] = useState("");
  
  const { 
    automations, 
    loading, 
    error, 
    user, 
    createAutomation, 
    updateAutomation,
    refreshAutomations
  } = useAutomations();

  const automation = automations[cardNumber];
  const content = automation?.content || null;

  // Set placeholder name based on card number
  useEffect(() => {
    const placeholderNames = [
      "Daily Tech News",
      "Investment Deals", 
      "Market Analysis",
      "Industry Updates",
      "Research Papers",
      "Startup News"
    ];
    const name = placeholderNames[cardNumber] || `Automation ${cardNumber + 1}`;
    setAutomationName(name);
    setOriginalAutomationName(name);
  }, [cardNumber]);

  // Content is now embedded in automation, no separate loading needed

  // Set initial editing state based on whether automation exists and user is authenticated
  useEffect(() => {
    if (!loading && !automation && user) {
      // Only start in editing mode if user is authenticated and no automation exists
      setIsEditing(true);
    } else if (!loading && !user) {
      // For demo users, always start in view mode (but they can switch to edit to see params)
      setIsEditing(false);
    }
    
    // Update original name when automation loads
    if (automation?.params?.name) {
      setAutomationName(automation.params.name);
      setOriginalAutomationName(automation.params.name);
    }
  }, [loading, automation, user]);

  // Scroll to top on mount to fix header off-screen after refresh
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pageRef.current) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  // Content loading is no longer needed since content is embedded

  const handleAutomationUpdate = async (
    _: number, 
    params: { retrieval_prompt: string; content_prompt: string; style_prompt: string; name: string }
  ) => {
    // Redirect to auth if user is not authenticated
    if (!user) {
              router.push('/auth/login');
      return;
    }

    try {
      toast.loading('Saving automation...', { id: `save-${cardNumber}` });
      
      // Include the automation name from the page state
      const paramsWithName = {
        ...params,
        name: automationName
      };
      
      if (automation) {
        await updateAutomation(cardNumber, paramsWithName);
      } else {
        await createAutomation(cardNumber, paramsWithName);
      }
      
      toast.success('Automation saved successfully!', { id: `save-${cardNumber}` });
      
      // Switch to view mode after saving and refresh automations (including content)
      setIsEditing(false);
      setTimeout(() => {
        refreshAutomations();
      }, 1000);
    } catch (error) {
      console.error('Error updating automation:', error);
      toast.error('Failed to save automation. Please try again.', { id: `save-${cardNumber}` });
      throw error;
    }
  };



  const handleEditClick = () => {
    // Allow demo users to view edit page but they can't save
    setIsEditing(true);
  };



  // Show loading state while checking auth and loading automations
  if (loading) {
    return (
      <>
        <Header />
        <div className="md:ml-56 min-h-screen bg-background p-6">
          <div className="min-h-screen flex flex-col bg-background rounded-lg shadow-sm">
            <div className="max-w-6xl mx-auto px-6 pt-8 pb-8 w-full">
              <div className="pt-4 mb-6">
                <div className="flex items-end justify-between">
                  <h1 className="text-4xl font-bold text-foreground">{automationName}</h1>
                  <div />
                </div>
                <div className="border-b border-border w-full mt-4" />
              </div>
              <div className="bg-background rounded-3xl min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading automation...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Header />
        <div className="md:ml-56 min-h-screen bg-background p-6">
          <div className="min-h-screen flex items-center justify-center bg-background rounded-lg shadow-sm">
            <div className="text-center max-w-md mx-auto px-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-foreground mb-4">Error Loading Automation</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => router.push('/home')} size="lg">
                <ArrowLeft className="h-4 w-4 mr-2 text-black" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const titleWidth = Math.max(automationName.length, 4);   // fallback when empty

  return (
    <>
      <Header />
      <div className="md:ml-56 min-h-screen bg-background">
        <div className="min-h-screen" ref={pageRef}>
          {/* Demo Banner for non-authenticated users */}
          {!user && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3 rounded-t-lg">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">Demo Mode</span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-sm">
                      You&apos;re viewing sample automation content. Sign in to create and customize your own automations.
                    </span>
                  </div>
                  <Button 
                    onClick={() => router.push('/auth/login')} 
                    size="sm"
                    variant="outline"
                    className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Container */}
          <div className="max-w-6xl mx-auto px-6 pt-8 pb-8">
            {/* Title Bar - Outside white box */}
            <div className="pt-4 mb-6">
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={automationName}
                        onChange={e => setAutomationName(e.target.value)}
                        className="
                          flex-none
                          text-xl sm:text-4xl font-bold
                          text-foreground bg-transparent
                          border-none outline-none focus:ring-0
                          p-0 m-0
                        "
                        style={{ width: `${titleWidth}ch` }}
                        aria-label="Automation name"
                      />
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl sm:text-4xl font-bold text-foreground">{automationName}</h1>
                      {/* Active Pill (View) */}
                      {automation?.active && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          Active
                        </span>
                      )}
                    </>
                  )}
                </div>
                {/* View/Edit Tabs - Outside white box */}
                <div className="flex items-end gap-2 ml-4 mt-2">
                  <button
                    className={`px-4 pb-2 text-base font-medium focus:outline-none transition-colors border-b-2 ${!isEditing ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
                    onClick={() => setIsEditing(false)}
                    type="button"
                  >
                    View
                  </button>
                  <button
                    className={`px-4 pb-2 text-base font-medium focus:outline-none transition-colors border-b-2 ${isEditing ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
                    onClick={handleEditClick}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {/* Border line - Outside white box */}
              <div className="border-b border-border w-full mt-4" />
            </div>

            {/* Content Area */}
            <div className="min-h-[550px]">
              <div>
                {isEditing ? (
                  <AutomationForm
                    automation={automation}
                    onSave={(params) => handleAutomationUpdate(cardNumber, params)}
                    size="hero"
                    isDemo={!user}
                    titleChanged={!!(automation && automationName !== originalAutomationName)}
                  />
                ) : (
                  <div>
                    {!content ? (
                      <div className="text-left pt-0 pl-0">
                        <h2 className="text-xl font-semibold text-foreground mb-2 mt-0">No content generated yet</h2>
                        <p className="text-base text-muted-foreground">
                          Content will be generated automatically each morning and displayed here.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Title */}
                        <h2 className="text-2xl font-bold text-foreground mb-6 leading-tight">
                          {content.title}
                        </h2>

                        {/* Content */}
                        <div className="prose prose-base prose-neutral dark:prose-invert max-w-none">
                          <div className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                            <MarkdownWithLatex>{content.content}</MarkdownWithLatex>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Back Button - Bottom left */}
            <div className="mt-8 mb-8">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 