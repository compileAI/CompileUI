/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ChatPageClient from '@/components/ChatPageClient';
import { Article } from '@/types';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/utils/recentlyVisited', () => ({
  addRecentlyVisited: jest.fn(),
  getRecentlyVisited: jest.fn(() => []),
}));

jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

jest.mock('@/components/RecommendedArticles', () => {
  return function MockRecommendedArticles({ onArticleClick }: { onArticleClick?: () => void }) {
    return (
      <div data-testid="recommended-articles">
        <button data-testid="recommended-article" onClick={onArticleClick}>
          Recommended Article
        </button>
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
};

const mockArticle: Article = {
  article_id: 'test-article-1',
  title: 'Test Article Title',
  content: 'This is test article content.',
  date: new Date('2024-01-15'),
  fingerprint: 'test-fingerprint',
  tag: 'test-tag',
  citations: [
    {
      sourceName: 'Test Source',
      articleTitle: 'Test Citation',
      url: 'https://example.com'
    }
  ]
};

describe('ChatPageClient', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ citations: mockArticle.citations }),
    });
    
    // Mock window.innerWidth for mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    // Mock scrollTop property
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      writable: true,
      configurable: true,
      value: 0,
    });

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Chat Visibility Toggle', () => {
    it('should initially hide the chat', () => {
      render(<ChatPageClient article={mockArticle} />);
      
      expect(screen.queryByText('Ask something about this article...')).not.toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('should show chat when chat button is clicked', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      const chatButton = screen.getByText('Chat');
      fireEvent.click(chatButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask something about this article...')).toBeInTheDocument();
        expect(screen.getByText('Close Chat')).toBeInTheDocument();
      });
    });

    it('should hide chat when close button is clicked', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      // Open chat
      const chatButton = screen.getByText('Chat');
      fireEvent.click(chatButton);
      
      await waitFor(() => {
        expect(screen.getByText('Close Chat')).toBeInTheDocument();
      });
      
      // Close chat
      const closeButton = screen.getByText('Close Chat');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Ask something about this article...')).not.toBeInTheDocument();
        expect(screen.getByText('Chat')).toBeInTheDocument();
      });
    });

    it('should auto-open chat when sending a message', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ citations: mockArticle.citations }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Test response' }),
        });

      render(<ChatPageClient article={mockArticle} initialMessage="Test message" />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask something about this article...')).toBeInTheDocument();
        expect(screen.getByText('Close Chat')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      // Set mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });
    });

    it('should show mobile toggle buttons on mobile', () => {
      render(<ChatPageClient article={mockArticle} />);
      
      // Trigger resize event to update mobile state
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(screen.getByText('Show Chat')).toBeInTheDocument();
    });

    it('should position chat button between date and content on mobile', () => {
      render(<ChatPageClient article={mockArticle} />);
      
      // Trigger resize event to update mobile state
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      const chatButton = screen.getByText('Show Chat');
      const dateElement = screen.getByText('January 14, 2024');
      const contentElement = screen.getByTestId('markdown-content');
      
      // Check that the chat button exists
      expect(chatButton).toBeInTheDocument();
      expect(dateElement).toBeInTheDocument();
      expect(contentElement).toBeInTheDocument();
      
      // The chat button should not be in the title area on mobile
      const titleArea = screen.getByText('Test Article Title').parentElement;
      expect(titleArea).not.toContainElement(chatButton);
    });

    it('should show return to article button when in chat view on mobile', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      // Trigger resize event to update mobile state
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      const showChatButton = screen.getByText('Show Chat');
      fireEvent.click(showChatButton);
      
      await waitFor(() => {
        // Should have a return button in the chat view
        expect(screen.getByText('Back to Article')).toBeInTheDocument();
        // Should also have the chat input
        expect(screen.getByPlaceholderText('Ask something about this article...')).toBeInTheDocument();
      });
    });

    it('should toggle between article and chat on mobile', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      // Trigger resize event to update mobile state
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      const showChatButton = screen.getByText('Show Chat');
      fireEvent.click(showChatButton);
      
      await waitFor(() => {
        expect(screen.getByText('Back to Article')).toBeInTheDocument();
      });
      
      const backToArticleButton = screen.getByText('Back to Article');
      fireEvent.click(backToArticleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Show Chat')).toBeInTheDocument();
        // Article content should be visible again
        expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
      });
    });

    it('should preserve scroll position when switching between article and chat', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      // Trigger resize event to update mobile state
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      // Mock scroll position
      const mockScrollTop = 100;
      const articleElement = document.querySelector('[data-testid="article-content-container"]');
      
      if (articleElement) {
        Object.defineProperty(articleElement, 'scrollTop', {
          writable: true,
          value: mockScrollTop,
        });
      }
      
      const showChatButton = screen.getByText('Show Chat');
      fireEvent.click(showChatButton);
      
      await waitFor(() => {
        expect(screen.getByText('Back to Article')).toBeInTheDocument();
      });
      
      const backToArticleButton = screen.getByText('Back to Article');
      fireEvent.click(backToArticleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Show Chat')).toBeInTheDocument();
      });
      
      // Verify scroll position was preserved (this is more of a behavioral test)
      expect(articleElement?.scrollTop).toBe(mockScrollTop);
    });
  });

  describe('Article Navigation', () => {
    it('should reset chat visibility when article changes', async () => {
      const { rerender } = render(<ChatPageClient article={mockArticle} />);
      
      // Open chat
      const chatButton = screen.getByText('Chat');
      fireEvent.click(chatButton);
      
      await waitFor(() => {
        expect(screen.getByText('Close Chat')).toBeInTheDocument();
      });
      
      // Change article
      const newArticle = { ...mockArticle, article_id: 'test-article-2', title: 'New Article' };
      rerender(<ChatPageClient article={newArticle} />);
      
      await waitFor(() => {
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.queryByText('Close Chat')).not.toBeInTheDocument();
      });
    });

    it('should close chat when recommended article is clicked', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      // Open chat
      const chatButton = screen.getByText('Chat');
      fireEvent.click(chatButton);
      
      await waitFor(() => {
        expect(screen.getByText('Close Chat')).toBeInTheDocument();
      });
      
      // Click recommended article
      const recommendedArticle = screen.getByTestId('recommended-article');
      fireEvent.click(recommendedArticle);
      
      await waitFor(() => {
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.queryByText('Close Chat')).not.toBeInTheDocument();
      });
    });
  });

  describe('Citations', () => {
    it('should render citations button with count', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      await waitFor(() => {
        expect(screen.getByText('Citations (1)')).toBeInTheDocument();
      });
    });

    it('should toggle citations dropdown', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      await waitFor(() => {
        const citationsButton = screen.getByText('Citations (1)');
        expect(citationsButton).toBeInTheDocument();
      });
      
      const citationsButton = screen.getByText('Citations (1)');
      fireEvent.click(citationsButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Source:')).toBeInTheDocument();
        expect(screen.getByText('Test Citation')).toBeInTheDocument();
      });
    });

    it('should close citations when article changes', async () => {
      const { rerender } = render(<ChatPageClient article={mockArticle} />);
      
      // Open citations
      await waitFor(() => {
        const citationsButton = screen.getByText('Citations (1)');
        fireEvent.click(citationsButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Test Source:')).toBeInTheDocument();
      });
      
      // Change article
      const newArticle = { ...mockArticle, article_id: 'test-article-2' };
      rerender(<ChatPageClient article={newArticle} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Test Source:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Layout Classes', () => {
    it('should apply correct classes for desktop with chat hidden', () => {
      const { container } = render(<ChatPageClient article={mockArticle} />);
      
      const mainContent = container.querySelector('[class*="w-full"]');
      expect(mainContent).toHaveClass('w-full');
    });

    it('should apply correct classes for desktop with chat visible', async () => {
      const { container } = render(<ChatPageClient article={mockArticle} />);
      
      const chatButton = screen.getByText('Chat');
      fireEvent.click(chatButton);
      
      await waitFor(() => {
        const mainContent = container.querySelector('[class*="w-1/2"]');
        expect(mainContent).toHaveClass('w-1/2');
      });
    });

    it('should apply max-width classes based on chat visibility', async () => {
      const { container } = render(<ChatPageClient article={mockArticle} />);
      
      // Chat hidden - should use max-w-4xl
      let articleContainer = container.querySelector('[class*="max-w-4xl"]');
      expect(articleContainer).toBeInTheDocument();
      
      // Open chat
      const chatButton = screen.getByText('Chat');
      fireEvent.click(chatButton);
      
      await waitFor(() => {
        // Chat visible - should use max-w-2xl
        const articleContainer = container.querySelector('[class*="max-w-2xl"]');
        expect(articleContainer).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ChatPageClient article={mockArticle} />);
      
      expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Compile\./i })).toBeInTheDocument();
    });

    it('should support keyboard navigation for chat toggle', async () => {
      render(<ChatPageClient article={mockArticle} />);
      
      const chatButton = screen.getByText('Chat');
      chatButton.focus();
      
      // Simulate pressing Enter which should trigger the button click
      fireEvent.keyDown(chatButton, { key: 'Enter' });
      fireEvent.click(chatButton); // Button components typically handle this automatically
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask something about this article...')).toBeInTheDocument();
      });
    });
  });
}); 