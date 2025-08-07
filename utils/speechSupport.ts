/**
 * Utility functions for checking Web Speech API browser support
 */

// Check if the browser supports Speech Recognition
export const isSpeechRecognitionSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );
};

// Get the Speech Recognition constructor
export const getSpeechRecognition = (): typeof SpeechRecognition | undefined => {
  if (typeof window === 'undefined') return undefined;
  
  // Chrome/Edge use webkitSpeechRecognition, standard is SpeechRecognition
  return (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition || undefined;
};

// Get browser compatibility info for debugging
export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return 'Server-side';
  
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  
  return 'Unknown';
};

// Check if we're on a mobile device
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};