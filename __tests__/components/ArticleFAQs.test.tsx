import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticleFAQs from '@/components/ArticleFAQs';
import { fetchFAQsForArticle } from '@/lib/fetchFAQs';
import { FAQ } from '@/types';

// Mock the FAQ fetching utility
jest.mock('@/lib/fetchFAQs');
const mockFetchFAQsForArticle = fetchFAQsForArticle as jest.MockedFunction<typeof fetchFAQsForArticle>;

const mockFAQs: FAQ[] = [
  {
    id: 'faq-1',
    gen_article_id: '123',
    question: 'What is the main topic of this article?',
    answer: 'The main topic is artificial intelligence.',
    created_at: '2024-01-01T12:00:00Z',
    question_short: 'Main topic?'
  },
  {
    id: 'faq-2',
    gen_article_id: '123',
    question: 'How does this technology impact the industry?',
    answer: 'It significantly changes the approach to automation.',
    created_at: '2024-01-01T12:01:00Z',
    question_short: 'Industry impact?'
  },
  {
    id: 'faq-3',
    gen_article_id: '123',
    question: 'What are the next steps for development?',
    answer: 'The next steps include more testing and deployment.',
    created_at: '2024-01-01T12:02:00Z',
    question_short: 'Next steps?'
  }
];

describe('ArticleFAQs', () => {
  const mockOnFAQClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FAQ Loading', () => {
    it('should not render anything while loading', () => {
      mockFetchFAQsForArticle.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={false} 
        />
      );

      expect(screen.queryByText('Main topic?')).not.toBeInTheDocument();
    });

    it('should not render anything when no FAQs are available', async () => {
      mockFetchFAQsForArticle.mockResolvedValue([]);

      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={false} 
        />
      );

      await waitFor(() => {
        expect(mockFetchFAQsForArticle).toHaveBeenCalledWith('123');
      });

      expect(screen.queryByText('Main topic?')).not.toBeInTheDocument();
    });

    it('should fetch FAQs on mount', async () => {
      mockFetchFAQsForArticle.mockResolvedValue(mockFAQs);

      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={false} 
        />
      );

      await waitFor(() => {
        expect(mockFetchFAQsForArticle).toHaveBeenCalledWith('123');
      });
    });
  });

  describe('Desktop Layout', () => {
    beforeEach(async () => {
      mockFetchFAQsForArticle.mockResolvedValue(mockFAQs);
    });

    it('should render 3 FAQ buttons in grid layout for desktop', async () => {
      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={false} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Main topic?')).toBeInTheDocument();
        expect(screen.getByText('Industry impact?')).toBeInTheDocument();
        expect(screen.getByText('Next steps?')).toBeInTheDocument();
      });

      // Check that buttons are rendered with correct styling
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      
      buttons.forEach(button => {
        expect(button).toHaveClass('bg-gray-100');
      });
    });

    it('should call onFAQClick with full question and answer when button is clicked', async () => {
      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={false} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Main topic?')).toBeInTheDocument();
      });

      const firstButton = screen.getByText('Main topic?');
      fireEvent.click(firstButton);

      expect(mockOnFAQClick).toHaveBeenCalledWith(
        'What is the main topic of this article?',
        'The main topic is artificial intelligence.'
      );
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(async () => {
      mockFetchFAQsForArticle.mockResolvedValue(mockFAQs);
    });

    it('should render dropdown button with FAQ count for mobile', async () => {
      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={true} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Questions (3)')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Questions \(3\)/ })).toBeInTheDocument();
    });

    it('should show FAQ options when dropdown is opened', async () => {
      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={true} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Questions (3)')).toBeInTheDocument();
      });

      // Initially, FAQ options should not be visible
      expect(screen.queryByText('Main topic?')).not.toBeInTheDocument();

      // Click to open dropdown
      const dropdownButton = screen.getByText('Questions (3)');
      fireEvent.click(dropdownButton);

      // Now FAQ options should be visible
      expect(screen.getByText('Main topic?')).toBeInTheDocument();
      expect(screen.getByText('Industry impact?')).toBeInTheDocument();
      expect(screen.getByText('Next steps?')).toBeInTheDocument();
    });

    it('should close dropdown when FAQ is clicked', async () => {
      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={true} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Questions (3)')).toBeInTheDocument();
      });

      // Open dropdown
      const dropdownButton = screen.getByText('Questions (3)');
      fireEvent.click(dropdownButton);

      // Click on an FAQ
      const faqButton = screen.getByText('Main topic?');
      fireEvent.click(faqButton);

      // Check that onFAQClick was called
      expect(mockOnFAQClick).toHaveBeenCalledWith(
        'What is the main topic of this article?',
        'The main topic is artificial intelligence.'
      );

      // Dropdown should close (FAQ options should not be visible)
      await waitFor(() => {
        expect(screen.queryByText('Main topic?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetchFAQsForArticle.mockRejectedValue(new Error('Network error'));

      render(
        <ArticleFAQs 
          articleId="123" 
          onFAQClick={mockOnFAQClick} 
          isMobile={false} 
        />
      );

      await waitFor(() => {
        expect(mockFetchFAQsForArticle).toHaveBeenCalledWith('123');
      });

      // Component should not render anything on error
      expect(screen.queryByText('Main topic?')).not.toBeInTheDocument();
    });
  });
}); 