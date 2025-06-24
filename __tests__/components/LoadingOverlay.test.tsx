import { render, screen } from '@testing-library/react';
import LoadingOverlay from '@/components/ui/loading-overlay';

describe('LoadingOverlay', () => {
  it('should not render when isVisible is false', () => {
    render(<LoadingOverlay isVisible={false} />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should render when isVisible is true', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display custom message when provided', () => {
    const customMessage = 'Loading your personalized feed...';
    render(<LoadingOverlay isVisible={true} message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    render(<LoadingOverlay isVisible={true} message="Loading articles..." />);
    
    const overlay = screen.getByText('Loading articles...').closest('div');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
  });

  it('should include loading spinner', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    // Check for the spinner by looking for the Loader2 icon classes
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
}); 