import { useState, useCallback, useRef, useEffect } from 'react';
import { getSpeechRecognition, isSpeechRecognitionSupported } from '@/utils/speechSupport';
import { logger } from '@/lib/logger';

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionProps {
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = ({
  onResult,
  onError,
  onEnd,
  language = 'en-US',
  continuous = true,  // Changed to true to prevent early stopping
  interimResults = true,
}: UseSpeechRecognitionProps = {}): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = isSpeechRecognitionSupported();

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;
    if (recognitionRef.current) return; // Prevent re-initialization

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;



    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    


    // Handle speech recognition results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
        
        if (onResult) {
          onResult({
            transcript: finalTranscript,
            confidence: event.results[event.results.length - 1][0].confidence,
            isFinal: true,
          });
        }
      } else if (interimTranscript) {
        setInterimTranscript(interimTranscript);
        
        if (onResult) {
          onResult({
            transcript: interimTranscript,
            confidence: event.results[event.results.length - 1][0].confidence,
            isFinal: false,
          });
        }
      }
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      
      
      // Don't show user-facing errors for "aborted" - it's often intentional
      if (event.error === 'aborted') {

        setIsListening(false);
        return;
      }
      
      let errorMessage = 'Speech recognition failed';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking clearly.';
          break;
        case 'audio-capture':
          errorMessage = 'Audio capture failed. Check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone permissions.';
          break;
        case 'network':
          errorMessage = 'Network error. Check your internet connection.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      logger.error('useSpeechRecognition', 'Speech recognition error', { error: errorMessage });
      setError(errorMessage);
      setIsListening(false);
      
      if (onError) {
        onError(errorMessage);
      }
    };

    // Handle recognition end
    recognition.onend = () => {
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (onEnd) {
        onEnd();
      }
    };

    // Handle recognition start
    recognition.onstart = () => {

      setIsListening(true);
      setError(null);
    };

    // Handle speech start (when user starts speaking)
    recognition.onspeechstart = () => {
      // User started speaking
    };

    // Handle speech end (when user stops speaking)
    recognition.onspeechend = () => {
      // User stopped speaking
    };

    // Handle audio start
    recognition.onaudiostart = () => {
      // Audio capture started
    };

    // Handle audio end
    recognition.onaudioend = () => {
      // Audio capture ended
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isSupported, language, continuous, interimResults, onResult, onError, onEnd]);

  const startListening = useCallback(async () => {
    if (!isSupported || !recognitionRef.current) {

      return;
    }

    if (isListening) {

      return;
    }

    // Check microphone permissions first
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permission.state === 'denied') {
        setError('Microphone access denied. Please allow microphone permissions.');
        return;
      }
    } catch (permErr) {

      // Continue anyway - older browsers might not support this API
    }

    try {

      setError(null);
      setTranscript('');
      setInterimTranscript('');
      
      // Don't abort if not currently running - this can cause issues
      // Just start fresh
      const recognition = recognitionRef.current;
      
      // Set up the timeout BEFORE starting
      timeoutRef.current = setTimeout(() => {

        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 60000);
      
      // Start recognition directly without delay
      recognition.start();

      
    } catch (err) {
      logger.error('useSpeechRecognition', 'Error starting speech recognition', { error: String(err) });
      setError('Failed to start speech recognition');
      setIsListening(false);
      
      // Clean up timeout if start failed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
  
      recognitionRef.current.stop();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (err) {
      logger.error('useSpeechRecognition', 'Error stopping speech recognition', { error: String(err) });
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};