import { render, screen, fireEvent } from '@testing-library/react';
import DemoHeader from '@/components/DemoHeader';
import { useRouter } from 'next/navigation';
import { usePreferences } from '@/hooks/usePreferences';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

describe('DemoHeader', () => {
  const push = jest.fn();
  const savePreferences = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push });
    (usePreferences as jest.Mock).mockReturnValue({
      preferences: null,
      isLoaded: true,
      savePreferences,
      hasPreferences: () => false,
      getContentInterests: () => '',
      getPresentationStyle: () => '',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to discover on search', () => {
    render(<DemoHeader />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(push).toHaveBeenCalledWith('/demo/discover?search=hello');
  });

  it('opens settings dialog when button clicked', () => {
    render(<DemoHeader />);
    const settings = screen.getByTitle('Settings');
    fireEvent.click(settings);
    expect(screen.getByText('Customize Your Experience')).toBeInTheDocument();
  });
});
