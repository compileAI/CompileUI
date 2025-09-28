import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';

interface NavigationState {
  isNavigating: boolean;
  destination: string | null;
}

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<NavigationState>({
    isNavigating: false,
    destination: null,
  });

  const navigateTo = useCallback(async (path: string, message?: string) => {
    // Extract base paths (without query params) for comparison
    const currentBasePath = pathname.split('?')[0];
    const targetBasePath = path.split('?')[0];

    // Build current full path including query string for exact comparison
    const currentQueryString = searchParams?.toString();
    const currentFullPath = currentQueryString ? `${currentBasePath}?${currentQueryString}` : currentBasePath;

    // Check if we're already on the exact same full path (including query)
    if (currentFullPath === path) {
      return; // Do nothing if already on the exact same full path
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
      logger.info('useNavigation', 'Navigating to path', { path, message });
      router.push(path);
      // Note: router.push doesn't throw errors, but we keep this for future-proofing
    } catch (error) {
      logger.error('useNavigation', 'Navigation error', { error: error instanceof Error ? error.message : String(error) });
      if (isChangingBasePath) {
        setState({
          isNavigating: false,
          destination: null,
        });
      }
    }
  }, [router, pathname, searchParams]);

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