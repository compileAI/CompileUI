/**
 * @jest-environment node
 */

import { GET } from '@/app/api/faqs/route';
import { NextRequest } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// Mock the Supabase client  
jest.mock('@/utils/supabase/server');
const mockCreateClientForServer = createClientForServer as jest.MockedFunction<typeof createClientForServer>;

describe('/api/faqs', () => {
  let mockSupabase: {
    from: jest.Mock;
  };

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };
    mockCreateClientForServer.mockResolvedValue(mockSupabase as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 400 when articleId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/faqs');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('articleId is required');
    });

    it('should return FAQs for a valid article ID', async () => {
      const mockFAQs = [
        {
          id: 'faq-1',
          gen_article_id: '123',
          question: 'What is the main point of this article?',
          answer: 'The main point is about AI developments.',
          created_at: '2024-01-01T12:00:00Z',
          question_short: 'Main point?'
        },
        {
          id: 'faq-2',
          gen_article_id: '123',
          question: 'How does this impact the industry?',
          answer: 'It significantly changes how we approach AI.',
          created_at: '2024-01-01T12:01:00Z',
          question_short: 'Industry impact?'
        }
      ];

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockFAQs,
          error: null
        })
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const request = new NextRequest('http://localhost:3000/api/faqs?articleId=123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.faqs).toHaveLength(2);
      expect(data.faqs[0].question_short).toBe('Main point?');
      expect(mockSupabase.from).toHaveBeenCalledWith('faqs');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should handle database errors gracefully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const request = new NextRequest('http://localhost:3000/api/faqs?articleId=123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch FAQs');
    });

    it('should return empty array when no FAQs exist', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const request = new NextRequest('http://localhost:3000/api/faqs?articleId=123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.faqs).toHaveLength(0);
    });
  });
}); 