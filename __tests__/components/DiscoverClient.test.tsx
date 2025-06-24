import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import DiscoverClient from '@/components/DiscoverClient';
import { useDiscoverArticles } from '@/hooks/useDiscoverArticles';

// Mock the hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@/hooks/useDiscoverArticles', () => ({
  useDiscoverArticles: jest.fn(),
}));

// Mock the Header component
jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

// Mock the ArticleList component
jest.mock('@/components/ArticleList', () => {
  return function MockArticleList({ articles }: { articles: unknown[] }) {
    return (
      <div data-testid="article-list">
        {articles.length} articles
      </div>
    );
  };
});

const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUseDiscoverArticles = useDiscoverArticles as jest.Mock;

const mockDiscoverHook = {
  articles: [],
  loading: false,
  error: undefined,
  hasMore: false,
  fetchArticles: jest.fn(),
  loadMore: jest.fn(),
  search: jest.fn(),
  refresh: jest.fn(),
  searchQuery: undefined,
};

describe('DiscoverClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    mockUseDiscoverArticles.mockReturnValue(mockDiscoverHook);
  });

  it('should render header and trigger initial fetch', () => {
    render(<DiscoverClient />);
    
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(mockDiscoverHook.fetchArticles).toHaveBeenCalled();
  });

  it('should trigger search when URL has search parameter', () => {
    const mockGet = jest.fn().mockReturnValue('AI technology');
    mockUseSearchParams.mockReturnValue({ get: mockGet });
    
    render(<DiscoverClient />);
    
    expect(mockDiscoverHook.search).toHaveBeenCalledWith('AI technology');
    expect(mockDiscoverHook.fetchArticles).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      loading: true,
      articles: [],
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
  });

  it('should show loading state for search', () => {
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      loading: true,
      articles: [],
      searchQuery: 'AI technology',
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText('Searching for relevant articles...')).toBeInTheDocument();
  });

  it('should show error state with retry button', () => {
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      error: 'Failed to fetch articles',
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText('Failed to fetch articles')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(mockDiscoverHook.refresh).toHaveBeenCalled();
  });

  it('should show articles when loaded', () => {
    const mockArticles = [
      { article_id: '1', title: 'Article 1' },
      { article_id: '2', title: 'Article 2' },
    ];
    
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      articles: mockArticles,
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByTestId('article-list')).toBeInTheDocument();
    expect(screen.getByText('2 articles')).toBeInTheDocument();
  });

  it('should show load more button when hasMore is true', () => {
    const mockArticles = [{ article_id: '1', title: 'Article 1' }];
    
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      articles: mockArticles,
      hasMore: true,
    });
    
    render(<DiscoverClient />);
    
    const loadMoreButton = screen.getByText('Load More Articles');
    fireEvent.click(loadMoreButton);
    
    expect(mockDiscoverHook.loadMore).toHaveBeenCalled();
  });

  it('should show loading more state', () => {
    const mockArticles = [{ article_id: '1', title: 'Article 1' }];
    
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      articles: mockArticles,
      hasMore: true,
      loading: true,
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText('Loading more articles...')).toBeInTheDocument();
  });

  it('should show end of results message', () => {
    const mockArticles = Array.from({ length: 25 }, (_, i) => ({
      article_id: `${i + 1}`,
      title: `Article ${i + 1}`,
    }));
    
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      articles: mockArticles,
      hasMore: false,
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText('You\'ve reached the end of the results.')).toBeInTheDocument();
  });

  it('should show empty state for no results', () => {
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      articles: [],
      loading: false,
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText('No articles available.')).toBeInTheDocument();
  });

  it('should show empty state for search with no results', () => {
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      articles: [],
      loading: false,
      searchQuery: 'nonexistent topic',
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText('No relevant articles found for your search.')).toBeInTheDocument();
    expect(screen.getByText('Try different keywords or check back later for new content.')).toBeInTheDocument();
  });

  it('should show search query in header when searching', () => {
    mockUseDiscoverArticles.mockReturnValue({
      ...mockDiscoverHook,
      searchQuery: 'AI technology',
      articles: [{ article_id: '1', title: 'Article 1' }],
    });
    
    render(<DiscoverClient />);
    
    expect(screen.getByText(/Search results for:/)).toBeInTheDocument();
    expect(screen.getByText(/"AI technology"/)).toBeInTheDocument();
  });
}); 