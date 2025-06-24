import { renderHook, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/hooks/useNavigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();

describe('useNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useNavigation());
    
    expect(result.current.isNavigating).toBe(false);
    expect(result.current.destination).toBe(null);
  });

  it('should set navigation state when navigating', async () => {
    const { result } = renderHook(() => useNavigation());
    
    // Start navigation
    act(() => {
      result.current.navigateTo('/discover', 'Loading articles...');
    });
    
    // Check immediate state
    expect(result.current.isNavigating).toBe(true);
    expect(result.current.destination).toBe('/discover');
    
    // Wait for async navigation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150)); // Wait longer than the 100ms delay
    });
    
    expect(mockPush).toHaveBeenCalledWith('/discover');
  });

  it('should clear navigation state', () => {
    const { result } = renderHook(() => useNavigation());
    
    act(() => {
      result.current.clearNavigation();
    });
    
    expect(result.current.isNavigating).toBe(false);
    expect(result.current.destination).toBe(null);
  });

  it('should maintain navigation state during successful navigation', async () => {
    const { result } = renderHook(() => useNavigation());
    
    // Start navigation
    act(() => {
      result.current.navigateTo('/success-page');
    });
    
    // Should be navigating initially
    expect(result.current.isNavigating).toBe(true);
    expect(result.current.destination).toBe('/success-page');
    
    // Wait for navigation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    // Should have called router.push
    expect(mockPush).toHaveBeenCalledWith('/success-page');
    
    // State should still be navigating (cleared by route change in real app)
    expect(result.current.isNavigating).toBe(true);
    expect(result.current.destination).toBe('/success-page');
  });
}); 