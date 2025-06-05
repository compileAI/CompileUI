import { render, screen } from '@testing-library/react';
import DemoPageClient from '@/components/DemoPageClient';
import { sampleArticle } from '../test/testUtils';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('DemoPageClient', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it('renders articles when provided', () => {
    render(<DemoPageClient cardsData={[sampleArticle]} />);
    expect(screen.getByText(sampleArticle.title)).toBeInTheDocument();
  });

  it('shows fallback when empty', () => {
    render(<DemoPageClient cardsData={[]} />);
    expect(screen.getByText('No items found.')).toBeInTheDocument();
  });
});
