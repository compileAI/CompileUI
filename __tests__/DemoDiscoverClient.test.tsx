import { render, screen, waitFor } from '@testing-library/react';
import DemoDiscoverClient from '@/components/DemoDiscoverClient';
import { useSearchParams, useRouter } from 'next/navigation';
import { sampleArticle } from '../test/testUtils';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

describe('DemoDiscoverClient', () => {
  const searchParams = { get: jest.fn() } as any;

  beforeEach(() => {
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows results from search', async () => {
    searchParams.get.mockReturnValue('hello');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [sampleArticle] }),
    });
    render(<DemoDiscoverClient initialArticles={[]} />);
    await waitFor(() => expect(screen.getByText(sampleArticle.title)).toBeInTheDocument());
  });

  it('shows fallback when no items', () => {
    searchParams.get.mockReturnValue(null);
    render(<DemoDiscoverClient initialArticles={[]} />);
    expect(screen.getByText('No items found.')).toBeInTheDocument();
  });
});
