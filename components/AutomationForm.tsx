"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Save, Bot } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Automation } from "@/types";
import toast from 'react-hot-toast';

interface AutomationFormProps {
  automation: Automation | null;
  onSave: (params: { user_prompt: string; name: string }) => Promise<void>;
  size: "hero" | "small";
  isDemo?: boolean;
  titleChanged?: boolean;
}

interface FormData {
  user_prompt: string;
  name: string;
}

export default function AutomationForm({ automation, onSave, size, isDemo = false, titleChanged = false }: AutomationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<FormData>({
    defaultValues: {
      user_prompt: automation?.params?.user_prompt || "",
      name: ""
    }
  });

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = form;
  
  // Consider the form dirty if either the form fields changed or the title changed
  const isFormDirty = isDirty || titleChanged;

  const watchedValues = watch();

  const onSubmit = async (data: FormData) => {
    if (!data.user_prompt) {
      toast.error('Automation prompt is required');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(data);
      toast.success('Automation saved successfully!');
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error('Failed to save automation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCharacterCount = (value: string) => value?.length || 0;
  const maxChars = 500;

  const isCompact = size === "small";

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-4">
        {/* Automation Prompt */}
        <div className="space-y-2">
          <Label htmlFor="user_prompt" className="text-base font-medium">
            Automation Prompt
          </Label>
          <div className="relative">
            <Textarea
              id="user_prompt"
              placeholder="Describe what you want this automation to do. e.g., 'Find the latest AI news and summarize key developments in a professional tone with bullet points'"
              className={`${isCompact ? 'min-h-[120px]' : 'min-h-[160px]'} text-sm pr-16 ${isDemo ? 'bg-muted cursor-not-allowed' : ''}`}
              {...register("user_prompt", { 
                required: "Automation prompt is required",
                maxLength: { value: maxChars, message: `Maximum ${maxChars} characters` }
              })}
              readOnly={isDemo}
            />
            <span className={`absolute bottom-2 right-3 text-xs ${getCharacterCount(watchedValues.user_prompt) > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
              {getCharacterCount(watchedValues.user_prompt)}/{maxChars}
            </span>
          </div>
          {errors.user_prompt && (
            <span className="text-xs text-destructive">{errors.user_prompt.message}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4">
          {isDemo ? (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                <p className="text-blue-700 dark:text-blue-300 font-medium mb-2">Demo Mode</p>
                <p className="text-blue-600 dark:text-blue-400 text-sm mb-3">
                  You&apos;re viewing this automation&apos;s configuration. Sign in to create and customize your own automations.
                </p>
                <Button
                  type="button"
                  onClick={() => window.location.href = '/auth/login'}
                  className="w-full text-base font-semibold py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md"
                  size="default"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Sign In to Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={isLoading || !isFormDirty}
              className="w-full text-base font-semibold py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-md"
              size="default"
            >
              {isLoading ? (
                <>
                  <Bot className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  {automation ? 'Save Changes' : 'Create'}
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
} 