"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { X, Search, FileText, Target, Microscope, Clipboard, Zap, Plus, Edit3 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { useRefresh } from "@/hooks/useRefresh";

import toast from 'react-hot-toast';

interface PreferenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: { contentInterests: string; presentationStyle: string }) => Promise<void>;
  initialPreferences?: {
    contentInterests: string;
    presentationStyle: string;
  };
}

interface PreferenceFormData {
  topics: string[];
  style: string;
  customStyle: string;
}

const DEFAULT_TOPICS = [
  "Models & Architectures",
  "Start-ups & VC Deals", 
  "Big-Tech Strategy",
  "Regulation & Policy",
  "Research Breakthroughs",
  "AI Ethics",
  "Hardware & Infrastructure",
  "Developer Tools",
  "Data Science",
  "Cybersecurity",
  "Enterprise AI",
  "Open Source"
];

const STYLE_PRESETS = [
  {
    id: "executive-brief",
    icon: FileText,
    title: "Executive Brief",
    tagline: "Key facts in 150 words",
    description: "Focus on key takeaways and business implications, write in a professional tone, highlight metrics and business impact"
  },
  {
    id: "explain-like-five", 
    icon: Target,
    title: "Explain Like I'm Five",
    tagline: "Simple analogies and metaphors",
    description: "Use simple language and analogies to explain complex concepts, avoid technical jargon, write in a conversational tone"
  },
  {
    id: "first-principles",
    icon: Microscope, 
    title: "First-Principles Walk-through",
    tagline: "Step-by-step reasoning",
    description: "Break down topics into fundamental principles, build up logic step-by-step, focus on reasoning and methodology"
  },
  {
    id: "just-facts",
    icon: Clipboard,
    title: "Just the Facts", 
    tagline: "Bullet list only",
    description: "Present only verified facts in bullet points, no opinions or commentary, focus on data and concrete information"
  },
  {
    id: "actionable-insights",
    icon: Zap, 
    title: "Actionable Insights",
    tagline: "Ends with next-steps",
    description: "Focus on actionable takeaways, highlight practical implications, end with next steps and recommendations"
  }
];

export default function PreferenceForm({ isOpen, onClose, onSave, initialPreferences }: PreferenceFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const { refresh, refreshesRemaining, isDisabled: isRefreshDisabled, isAuthenticated, fetchRefreshCount } = useRefresh();
  const router = useRouter();
  
  const form = useForm<PreferenceFormData>({
    defaultValues: {
      topics: [],
      style: "executive-brief",
      customStyle: ""
    }
  });

  const { watch, setValue, getValues } = form;
  const watchedTopics = watch("topics");
  const watchedStyle = watch("style");
  const watchedCustomStyle = watch("customStyle");

  // Initialize form with existing preferences
  useEffect(() => {
    if (initialPreferences) {
      const topics = initialPreferences.contentInterests 
        ? initialPreferences.contentInterests.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      
      // Check if it's a custom style
      const matchedPreset = STYLE_PRESETS.find(preset => 
        initialPreferences.presentationStyle.includes(preset.description.substring(0, 20))
      );
      
      if (matchedPreset) {
        setValue("style", matchedPreset.id);
        setValue("customStyle", "");
      } else {
        setValue("style", "custom");
        setValue("customStyle", initialPreferences.presentationStyle);
      }
      
      setValue("topics", topics);
    }
  }, [initialPreferences, setValue]);

  // Generate preview when topics or style changes
  useEffect(() => {
    if (watchedTopics.length > 0 && (watchedStyle || watchedCustomStyle)) {
      const selectedStyle = STYLE_PRESETS.find(s => s.id === watchedStyle);
      const styleDescription = selectedStyle?.description || watchedCustomStyle;
      if (!styleDescription || watchedTopics.length === 0) {
        setPreviewContent(null);
        return;
      }
      let preview = "";
      if (watchedStyle === "custom" && watchedCustomStyle) {
        preview = `Custom Style Preview:\n\nOpenAI GPT-5 Launch: ${watchedCustomStyle}\n\nThis preview shows how your custom writing style would be applied to AI news articles.`;
      } else if (selectedStyle) {
        switch (selectedStyle.id) {
          case "executive-brief":
            preview = `OpenAI GPT-5 Launch: Key Development\n• Revolutionary multimodal AI model released\n• Market impact: $500B AI sector growth projected\n• 10x performance improvement over GPT-4\n• Enterprise adoption expected within 6 months\n\nSources: OpenAI blog, TechCrunch, WSJ`;
            break;
          case "explain-like-five":
            preview = `Think of the new GPT-5 like having a super-smart friend who can see, hear, and understand everything!\n\nImagine your regular smart friend (GPT-4) could only read books. Now this new friend can also look at pictures, watch videos, and even help you with math homework by seeing the problems. It's like upgrading from a bicycle to a rocket ship!`;
            break;
          case "first-principles":
            preview = `Understanding GPT-5's Breakthrough\n\n1. Core problem: Previous AI models were limited to text-only understanding\n2. OpenAI's approach: Unified architecture processing text, images, audio, and video\n3. Key innovation: Cross-modal reasoning allows simultaneous understanding\n4. Technical foundation: Transformer architecture with 10T parameters\n5. Implications: Enables human-level multimodal comprehension`;
            break;
          case "just-facts":
            preview = `• OpenAI released GPT-5 on December 15, 2024\n• Model size: 10 trillion parameters\n• Capabilities: Text, image, audio, video processing\n• Performance: 90% on graduate-level reasoning tasks\n• Pricing: $0.03 per 1K input tokens\n• Availability: API access, ChatGPT Pro subscribers\n• Competitors: Google Gemini Ultra, Anthropic Claude 3.5`;
            break;
          case "actionable-insights":
            preview = `GPT-5 transforms the AI landscape with unprecedented multimodal capabilities.\n\nImmediate opportunities:\n→ Integrate GPT-5 API into existing products for competitive advantage\n→ Develop video/audio content analysis tools\n→ Create educational apps leveraging visual understanding\n\nRisks to monitor:\n→ Increased operational costs vs. current models\n→ Potential regulatory scrutiny on advanced AI`;
            break;
        }
      }
      setPreviewContent(preview);
    } else {
      setPreviewContent(null);
    }
  }, [watchedTopics, watchedStyle, watchedCustomStyle]);

  // Fetch refresh count when the form opens and user is authenticated
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchRefreshCount();
    }
  }, [isOpen, isAuthenticated, fetchRefreshCount]);

  const addTopic = (topic: string) => {
    const currentTopics = getValues("topics");
    if (currentTopics.length >= 10) {
      toast.error("Maximum 10 topics allowed");
      return;
    }
    if (!currentTopics.includes(topic)) {
      setValue("topics", [...currentTopics, topic]);
    }
    setSearchQuery("");
  };

  const removeTopic = (topicToRemove: string) => {
    const currentTopics = getValues("topics");
    setValue("topics", currentTopics.filter(topic => topic !== topicToRemove));
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();
      addTopic(searchQuery.trim());
    }
  };

  const handleStyleSelect = (styleId: string) => {
    setValue("style", styleId);
    if (styleId !== "custom") {
      setValue("customStyle", "");
    }
  };

  const filteredSuggestions = DEFAULT_TOPICS.filter(topic => 
    !watchedTopics.includes(topic) && 
    topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = async (data: PreferenceFormData) => {
    try {
      toast.loading('Saving preferences...', { id: 'save' });
      
      const contentInterests = data.topics.join(', ');
      let presentationStyle = "";
      
      if (data.style === "custom") {
        presentationStyle = data.customStyle;
      } else {
        const selectedPreset = STYLE_PRESETS.find(preset => preset.id === data.style);
        presentationStyle = selectedPreset?.description || "";
      }

      console.log('PreferenceForm saving:', { contentInterests, presentationStyle });

      await onSave({
        contentInterests,
        presentationStyle
      });
      
      console.log('PreferenceForm save completed');
      
      // Clear discover cache and notify about preference changes
      localStorage.removeItem("compile-discover-articles");
      window.dispatchEvent(new CustomEvent('preferencesChanged', { detail: null }));
      
      // If user is authenticated and has refreshes remaining, trigger refresh
      if (isAuthenticated && refreshesRemaining > 0) {
        toast.loading('Refreshing content...', { id: 'refresh' });
        
        try {
          await refresh(true); // Prevent automatic page reload
          
          toast.success('Preferences saved and content refreshed!', { id: 'save' });
          toast.success('Cache cleared successfully!', { id: 'refresh' });
        } catch (refreshError) {
          console.error('Refresh failed after save:', refreshError);
          toast.success('Preferences saved successfully!', { id: 'save' });
          toast.error('Failed to refresh content. You can refresh manually later.', { id: 'refresh' });
        }
      } else {
        toast.success('Preferences saved successfully!', { id: 'save' });
      }
      
      setShowSavedMessage(true);
      
      // Hide the saved message and close modal after a short delay
      setTimeout(() => {
        setShowSavedMessage(false);
        onClose();
        
        // No need to navigate - the cache update event will refresh the articles automatically
      }, 800);
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.', { id: 'save' });
    }
  };

  if (!isOpen) return null;

  // Show sign-in message if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
        onClick={onClose}
      >
        <div 
          className="bg-background dark:bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
              <Search className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-foreground">Sign in to customize</h2>
              <p className="text-muted-foreground mt-2">
                Personalize your content preferences and writing style by signing in to your account.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/auth')}
                className="w-full"
              >
                Sign In
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-background dark:bg-background rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] mx-4 overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Personalize Home Feed</h2>
            <p className="text-muted-foreground mt-1 italic text-sm">Pick a few topics & a writing style—change anytime</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-5">
          {/* Topic Picker */}
          <div className="space-y-4">
            <Label className="text-lg font-medium">Topics (choose 1-10)</Label>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                placeholder="Type to search or add custom topics (press Enter to add)..."
                className="pl-10"
              />
            </div>

            {/* Custom Topic Preview */}
            {searchQuery.trim() && !filteredSuggestions.some(topic => topic.toLowerCase() === searchQuery.toLowerCase()) && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Add custom topic:</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTopic(searchQuery.trim())}
                  className="text-xs rounded-full border-dashed border-primary/40 text-primary hover:bg-primary/10 dark:border-primary/60 dark:text-primary dark:hover:bg-primary/20 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {searchQuery.trim()}
                </Button>
              </div>
            )}

            {/* Suggested Topics */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Suggested topics:</p>
              <div className="flex flex-wrap gap-2">
                {filteredSuggestions.map((topic) => (
                  <Button
                    key={topic}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTopic(topic)}
                    className="text-xs rounded-full"
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Topics */}
            {watchedTopics.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selected topics:</p>
                <div className="flex flex-wrap gap-2">
                  {watchedTopics.map((topic) => (
                    <div
                      key={topic}
                      className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => removeTopic(topic)}
                        className="text-primary/70 hover:text-primary dark:text-primary/80 dark:hover:text-primary"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{watchedTopics.length}/10 topics selected</p>
              </div>
            )}
          </div>

          {/* Style Selector */}
          <div className="space-y-4">
            <Label className="text-lg font-medium">Writing style</Label>
            
            <div className="space-y-2">
              {STYLE_PRESETS.map((preset) => (
                <Card 
                  key={preset.id} 
                  className={`p-3 cursor-pointer transition-all ${
                    watchedStyle === preset.id 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10 dark:ring-primary/30' 
                      : 'border-border hover:bg-muted hover:border-border/80 dark:hover:bg-muted'
                  }`} 
                  onClick={() => handleStyleSelect(preset.id)}
                >
                  <div className="flex items-center gap-3">
                    <preset.icon className={`h-4 w-4 ${
                      watchedStyle === preset.id ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${
                        watchedStyle === preset.id ? 'text-primary' : 'text-foreground'
                      }`}>{preset.title}</div>
                      <div className={`text-xs ${
                        watchedStyle === preset.id ? 'text-primary/80' : 'text-muted-foreground'
                      }`}>{preset.tagline}</div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Custom Style Option */}
              <Card 
                className={`p-3 cursor-pointer transition-all ${
                  watchedStyle === "custom" 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10 dark:ring-primary/30' 
                    : 'border-border hover:bg-muted hover:border-border/80 dark:hover:bg-muted'
                }`} 
                onClick={() => handleStyleSelect("custom")}
              >
                <div className="flex items-center gap-3">
                  <Edit3 className={`h-4 w-4 ${
                    watchedStyle === "custom" ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${
                      watchedStyle === "custom" ? 'text-primary' : 'text-foreground'
                    }`}>Custom Style</div>
                    <div className={`text-xs ${
                      watchedStyle === "custom" ? 'text-primary/80' : 'text-muted-foreground'
                    }`}>Write your own instructions</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Custom Style Text Area */}
            {watchedStyle === "custom" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom writing instructions</Label>
                <Textarea
                  {...form.register("customStyle")}
                  placeholder="Describe how you want articles to be written. For example: 'Write in a casual, humorous tone with lots of pop culture references' or 'Focus on technical details and include code examples when relevant'"
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {watchedCustomStyle.length}/500 characters
                </p>
              </div>
            )}
          </div>

          {/* Live Preview */}
          {previewContent && (
            <div className="space-y-4">
              <Label className="text-lg font-medium">Preview</Label>
              <Card className="p-4 bg-muted/50 dark:bg-muted/30">
                <div className="text-sm text-foreground whitespace-pre-line font-mono">
                  {previewContent}
                </div>
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={watchedTopics.length === 0 || (watchedStyle === "custom" && !watchedCustomStyle.trim()) || (isAuthenticated && isRefreshDisabled)}
            >
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span>Save & Refresh</span>
                  {isRefreshDisabled ? (
                    <span className="text-xs opacity-70">(Limit reached)</span>
                  ) : (
                    <span className="text-xs opacity-70">({refreshesRemaining} left)</span>
                  )}
                </div>
              ) : (
                "Save"
              )}
            </Button>
          </div>

          {/* Success Message */}
          {showSavedMessage && (
            <div className="text-center">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ Preferences saved successfully! Your homepage will refresh with new content.
              </p>
            </div>
          )}
        </form>
        </div>
      </div>
    </div>
  );
} 