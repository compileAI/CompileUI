"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { getBrowserInfo } from '@/utils/speechSupport';
import { logger } from '@/lib/logger';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  showUnsupportedMessage?: boolean; // Optional: show why button isn't available
  onInterimTranscript?: (transcript: string) => void; // Real-time transcript updates
  currentText?: string; // Current text in the input to append to
  onStartRecording?: () => void; // Called when recording starts
}

export default function VoiceInput({ 
  onTranscript, 
  onError, 
  disabled = false,
  className = '',
  showUnsupportedMessage = false,
  onInterimTranscript,
  currentText = '',
  onStartRecording
}: VoiceInputProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const baseTextRef = useRef(''); // Text captured when recording starts
  const accumulatedVoiceTextRef = useRef(''); // Accumulated voice transcript

  const {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    onResult: (result) => {
      // Update our accumulated voice text based on the result
      if (result.isFinal) {
        accumulatedVoiceTextRef.current = accumulatedVoiceTextRef.current + result.transcript;
      }
      
      // Calculate current voice text (accumulated + current interim)
      const currentVoiceText = accumulatedVoiceTextRef.current + (result.isFinal ? '' : result.transcript);
      const baseText = baseTextRef.current;
      const fullText = baseText + (baseText && currentVoiceText ? ' ' : '') + currentVoiceText;
      
      if (onInterimTranscript) {
        onInterimTranscript(fullText);
      }
    },
    onError: (errorMsg) => {
      logger.error('VoiceInput', 'Voice input error', { error: errorMsg });
      if (onError) {
        onError(errorMsg);
      }
    },
    onEnd: () => {
      // When recognition ends, append to the text that was there when recording started
      const voiceText = accumulatedVoiceTextRef.current.trim();
      const baseText = baseTextRef.current;
      if (voiceText) {
        const finalText = baseText + (baseText && voiceText ? ' ' : '') + voiceText;
        onTranscript(finalText);
      } else if (baseText) {
        // If no voice was captured but there was base text, keep the base text
        onTranscript(baseText);
      }
    },
    continuous: true,  // Force continuous mode
    interimResults: true,
  });

  // Timer countdown when listening
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isListening) {
      setTimeLeft(60);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopListening();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(60);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening, stopListening]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      // Capture the current text as the base to append to
      baseTextRef.current = currentText;
      
      // Reset accumulated voice text for new recording
      accumulatedVoiceTextRef.current = '';
      
      // Notify parent that recording is starting
      if (onStartRecording) {
        onStartRecording();
      }
      
      resetTranscript();
      startListening();
    }
  };

  // Don't render if not supported (unless we want to show a message)
  if (!isSupported) {
    if (showUnsupportedMessage) {
      return (
        <div className={`text-xs text-muted-foreground ${className}`}>
          Voice input not supported in {getBrowserInfo()}. Try Chrome or Edge.
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* Just the microphone button */}
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={handleToggleListening}
        disabled={disabled}
        className={`transition-all duration-200 ${
          isListening 
            ? 'animate-slow-pulse bg-red-500/80 hover:bg-red-600/80' 
            : 'hover:bg-muted'
        } ${className}`}
        title={
          isListening 
            ? `Recording... ${timeLeft}s left` 
            : 'Click to start voice input'
        }
      >
        {isListening ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Error Display - positioned as fixed overlay */}
      {error && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 shadow-xl z-50">
          {error}
        </div>
      )}
    </>
  );
}