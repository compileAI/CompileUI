import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import { useNavigation } from '@/hooks/useNavigation';
import { usePreferences } from '@/hooks/usePreferences';

// Mock all dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/hooks/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn(),
    },
  })),
}));

const mockRouter = {
  push: jest.fn(),
};

const mockNavigation = {
  isNavigating: false,
  destination: null,
  navigateTo: jest.fn(),
  clearNavigation: jest.fn(),
};

const mockPreferences = {
  preferences: null,
  savePreferences: jest.fn(),
  hasPreferences: jest.fn(() => false),
  user: null,
  conflict: null,
  isConflictDialogOpen: false,
  resolveConflict: jest.fn(),
  getContentInterests: jest.fn(() => ''),
  getPresentationStyle: jest.fn(() => ''),
  isLoaded: true,
};

describe('Navigation Loading Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/home');
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (usePreferences as jest.Mock).mockReturnValue(mockPreferences);
  });

  it('should show correct loading message when navigating to home', async () => {
    (useNavigation as jest.Mock).mockReturnValue({
      ...mockNavigation,
      isNavigating: true,
      destination: '/home',
    });

    render(<Header />);
    
    expect(screen.getByText('Loading your personalized feed...')).toBeInTheDocument();
  });

  it('should show correct loading message when navigating to discover', async () => {
    (useNavigation as jest.Mock).mockReturnValue({
      ...mockNavigation,
      isNavigating: true,
      destination: '/discover',
    });

    render(<Header />);
    
    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
  });

  it('should call navigateTo with correct parameters when clicking Home button', () => {
    render(<Header />);
    
    const homeButton = screen.getByText('Home');
    fireEvent.click(homeButton);
    
    expect(mockNavigation.navigateTo).toHaveBeenCalledWith('/home', 'Loading your personalized feed...');
  });

  it('should call navigateTo with correct parameters when clicking Discover button', () => {
    render(<Header />);
    
    const discoverButton = screen.getByText('Discover');
    fireEvent.click(discoverButton);
    
    expect(mockNavigation.navigateTo).toHaveBeenCalledWith('/discover', 'Loading articles...');
  });

  it('should disable navigation buttons when navigating', () => {
    (useNavigation as jest.Mock).mockReturnValue({
      ...mockNavigation,
      isNavigating: true,
    });

    render(<Header />);
    
    const homeButton = screen.getByText('Home');
    const discoverButton = screen.getByText('Discover');
    
    expect(homeButton).toBeDisabled();
    expect(discoverButton).toBeDisabled();
  });

  it('should clear navigation state when pathname changes', () => {
    const { rerender } = render(<Header />);
    
    // Change pathname
    (usePathname as jest.Mock).mockReturnValue('/discover');
    rerender(<Header />);
    
    expect(mockNavigation.clearNavigation).toHaveBeenCalled();
  });

  it('should show loading overlay with backdrop when navigating', () => {
    (useNavigation as jest.Mock).mockReturnValue({
      ...mockNavigation,
      isNavigating: true,
      destination: '/discover',
    });

    render(<Header />);
    
    // Check for overlay elements
    const overlay = document.querySelector('.fixed.inset-0.z-50');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('bg-background/80', 'backdrop-blur-sm');
  });

  it('should handle search navigation with loading state', () => {
    render(<Header />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(searchInput, { target: { value: 'AI technology' } });
    fireEvent.click(searchButton);
    
    expect(mockNavigation.navigateTo).toHaveBeenCalledWith(
      '/discover?search=AI%20technology',
      'Searching...'
    );
  });

  it('should handle Enter key in search input', () => {
    render(<Header />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    
    expect(mockNavigation.navigateTo).toHaveBeenCalledWith(
      '/discover?search=machine%20learning',
      'Searching...'
    );
  });
}); 