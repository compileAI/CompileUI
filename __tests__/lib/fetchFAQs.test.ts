import { selectFAQs, fetchFAQsForArticle } from '@/lib/fetchFAQs';
import { FAQ } from '@/types';

// Mock global fetch
global.fetch = jest.fn();

describe('fetchFAQs utilities', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectFAQs', () => {
    const mockFAQs: FAQ[] = [
      {
        id: 'faq-1',
        gen_article_id: '123',
        question: 'What is AI?',
        answer: 'AI stands for Artificial Intelligence.',
        created_at: '2024-01-01T12:00:00Z',
        question_short: 'What is AI?'
      },
      {
        id: 'faq-2',
        gen_article_id: '123',
        question: 'How does machine learning work?',
        answer: 'Machine learning uses algorithms to find patterns.',
        created_at: '2024-01-01T12:01:00Z',
        question_short: 'How does ML work?'
      },
      {
        id: 'faq-3',
        gen_article_id: '123',
        question: 'What are neural networks?',
        answer: 'Neural networks are inspired by biological neurons.',
        created_at: '2024-01-01T12:02:00Z',
        question_short: 'What are NNs?'
      },
      {
        id: 'faq-4',
        gen_article_id: '123',
        question: 'What is deep learning?',
        answer: 'Deep learning uses multiple layers of neural networks.',
        created_at: '2024-01-01T12:03:00Z',
        question_short: 'What is DL?'
      },
      {
        id: 'faq-5',
        gen_article_id: '123',
        question: 'How does reinforcement learning work?',
        answer: 'RL learns through trial and error with rewards.',
        created_at: '2024-01-01T12:04:00Z',
        question_short: 'How does RL work?'
      }
    ];

    it('should return all FAQs if there are 3 or fewer', () => {
      const threeFAQs = mockFAQs.slice(0, 3);
      const result = selectFAQs(threeFAQs, 'article-123');
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(threeFAQs);
    });

    it('should return empty array if no FAQs provided', () => {
      const result = selectFAQs([], 'article-123');
      
      expect(result).toHaveLength(0);
    });

    it('should return exactly 3 FAQs if more than 3 are provided', () => {
      const result = selectFAQs(mockFAQs, 'article-123');
      
      expect(result).toHaveLength(3);
      // Verify all returned FAQs are from the original set
      result.forEach(faq => {
        expect(mockFAQs).toContainEqual(faq);
      });
    });

    it('should be deterministic - same article ID should return same FAQs', () => {
      const result1 = selectFAQs(mockFAQs, 'article-123');
      const result2 = selectFAQs(mockFAQs, 'article-123');
      
      expect(result1).toEqual(result2);
    });

    it('should return different FAQs for different article IDs', () => {
      const result1 = selectFAQs(mockFAQs, 'article-123');
      const result2 = selectFAQs(mockFAQs, 'article-456');
      
      // Results should be different (very unlikely to be the same with 5 FAQs)
      expect(result1).not.toEqual(result2);
    });
  });

  describe('fetchFAQsForArticle', () => {
    it('should fetch and return selected FAQs successfully', async () => {
      const mockFAQs = [
        {
          id: 'faq-1',
          gen_article_id: '123',
          question: 'What is AI?',
          answer: 'AI stands for Artificial Intelligence.',
          created_at: '2024-01-01T12:00:00Z',
          question_short: 'What is AI?'
        },
        {
          id: 'faq-2',
          gen_article_id: '123',
          question: 'How does ML work?',
          answer: 'ML uses algorithms.',
          created_at: '2024-01-01T12:01:00Z',
          question_short: 'How does ML work?'
        }
      ];

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, faqs: mockFAQs })
      } as Response);

      const result = await fetchFAQsForArticle('123');

      expect(mockFetch).toHaveBeenCalledWith('/api/faqs?articleId=123');
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockFAQs);
    });

    it('should return empty array when API returns error', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await fetchFAQsForArticle('123');

      expect(result).toHaveLength(0);
    });

    it('should return empty array when API response indicates failure', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Database error' })
      } as Response);

      const result = await fetchFAQsForArticle('123');

      expect(result).toHaveLength(0);
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchFAQsForArticle('123');

      expect(result).toHaveLength(0);
    });
  });
}); 