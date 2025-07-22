"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { X, Save, Bot } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Automation } from "@/types";
import toast from 'react-hot-toast';

interface AutomationFormProps {
  automation: Automation | null;
  onSave: (params: { retrieval_prompt: string; content_prompt: string; style_prompt: string }) => Promise<void>;
  onDiscard: () => void;
  size: "hero" | "small";
}

interface FormData {
  retrieval_prompt: string;
  content_prompt: string;
  style_prompt: string;
}

export default function AutomationForm({ automation, onSave, onDiscard, size }: AutomationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<FormData>({
    defaultValues: {
      retrieval_prompt: automation?.params?.retrieval_prompt || "",
      content_prompt: automation?.params?.content_prompt || "",
      style_prompt: automation?.params?.style_prompt || ""
    }
  });

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = form;

  const watchedValues = watch();

  const onSubmit = async (data: FormData) => {
    if (!data.retrieval_prompt || !data.content_prompt || !data.style_prompt) {
      toast.error('All prompt fields are required');
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

  const handleDiscard = () => {
    if (isDirty && !confirm('Are you sure you want to discard your changes?')) {
      return;
    }
    onDiscard();
  };

  const getCharacterCount = (value: string) => value?.length || 0;
  const maxChars = 500;

  const isCompact = size === "small";

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-4">
        {/* Retrieval Prompt */}
        <div className="space-y-2">
          <Label htmlFor="retrieval_prompt" className="text-base font-medium">
            Retrieval Prompt
          </Label>
          <div className="relative">
            <Textarea
              id="retrieval_prompt"
              placeholder="What topics should this automation search for? e.g., 'Find AI startup funding news'"
              className={`${isCompact ? 'min-h-[60px]' : 'min-h-[80px]'} text-sm pr-16`}
              {...register("retrieval_prompt", { 
                required: "Retrieval prompt is required",
                maxLength: { value: maxChars, message: `Maximum ${maxChars} characters` }
              })}
            />
            <span className={`absolute bottom-2 right-3 text-xs ${getCharacterCount(watchedValues.retrieval_prompt) > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
              {getCharacterCount(watchedValues.retrieval_prompt)}/{maxChars}
            </span>
          </div>
          {errors.retrieval_prompt && (
            <span className="text-xs text-destructive">{errors.retrieval_prompt.message}</span>
          )}
        </div>

        {/* Content Prompt */}
        <div className="space-y-2">
          <Label htmlFor="content_prompt" className="text-base font-medium">
            Content Prompt
          </Label>
          <div className="relative">
            <Textarea
              id="content_prompt"
              placeholder="How should the content be structured? e.g., 'Summarize key points with business impact'"
              className={`${isCompact ? 'min-h-[60px]' : 'min-h-[80px]'} text-sm pr-16`}
              {...register("content_prompt", { 
                required: "Content prompt is required",
                maxLength: { value: maxChars, message: `Maximum ${maxChars} characters` }
              })}
            />
            <span className={`absolute bottom-2 right-3 text-xs ${getCharacterCount(watchedValues.content_prompt) > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
              {getCharacterCount(watchedValues.content_prompt)}/{maxChars}
            </span>
          </div>
          {errors.content_prompt && (
            <span className="text-xs text-destructive">{errors.content_prompt.message}</span>
          )}
        </div>

        {/* Style Prompt */}
        <div className="space-y-2">
          <Label htmlFor="style_prompt" className="text-base font-medium">
            Style Prompt
          </Label>
          <div className="relative">
            <Textarea
              id="style_prompt"
              placeholder="What tone and style should be used? e.g., 'Professional tone with bullet points'"
              className={`${isCompact ? 'min-h-[60px]' : 'min-h-[80px]'} text-sm pr-16`}
              {...register("style_prompt", { 
                required: "Style prompt is required",
                maxLength: { value: maxChars, message: `Maximum ${maxChars} characters` }
              })}
            />
            <span className={`absolute bottom-2 right-3 text-xs ${getCharacterCount(watchedValues.style_prompt) > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
              {getCharacterCount(watchedValues.style_prompt)}/{maxChars}
            </span>
          </div>
          {errors.style_prompt && (
            <span className="text-xs text-destructive">{errors.style_prompt.message}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={isLoading || !isDirty}
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
        </div>
      </form>
    </div>
  );
} 