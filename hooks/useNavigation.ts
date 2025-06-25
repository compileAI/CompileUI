import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationState {
  isNavigating: boolean;
  destination: string | null;
}

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<NavigationState>({
    isNavigating: false,
    destination: null,
  });

  const navigateTo = useCallback(async (path: string, message?: string) => {
    // Extract base paths (without query params) for comparison
    const currentBasePath = pathname.split('?')[0];
    const targetBasePath = path.split('?')[0];

    // Check if we're already on the target path
    if (pathname === path) {
      return; // Do nothing if already on the exact same path
    }

    // Only show mounting loading animation if base path is changing
    const isChangingBasePath = currentBasePath !== targetBasePath;

    if (isChangingBasePath) {
      setState({
        isNavigating: true,
        destination: path,
      });
      // Small delay to ensure loading overlay is visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      router.push(path);
      // Note: router.push doesn't throw errors, but we keep this for future-proofing
    } catch (error) {
      console.error('Navigation error:', error);
      if (isChangingBasePath) {
        setState({
          isNavigating: false,
          destination: null,
        });
      }
    }
  }, [router, pathname]);

  const clearNavigation = useCallback(() => {
    setState({
      isNavigating: false,
      destination: null,
    });
  }, []);

  return {
    isNavigating: state.isNavigating,
    destination: state.destination,
    currentPath: pathname,
    navigateTo,
    clearNavigation,
  };
} 