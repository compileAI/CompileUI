import { GET } from '@/app/api/enhanced-articles/route';
import { NextRequest } from 'next/server';
import { performVectorSearch } from '@/lib/vectorSearch';
import { createClientForServer } from '@/utils/supabase/server';

// Mock dependencies
jest.mock('@/lib/vectorSearch');
jest.mock('@/utils/supabase/server');
jest.mock('@google/genai');

const mockPerformVectorSearch = performVectorSearch as jest.MockedFunction<typeof performVectorSearch>;
const mockCreateClientForServer = createClientForServer as jest.MockedFunction<typeof createClientForServer>;

// Mock Google GenAI
const mockGenAI = {
  models: {
    generateContent: jest.fn().mockResolvedValue({
      text: 'Enhanced article content'
    })
  }
};

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => mockGenAI)
}));

describe('/api/enhanced-articles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase client
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn()
      }
    };
    
    mockCreateClientForServer.mockResolvedValue(mockSupabase as any);
  });

  describe('GET', () => {
    it('should return 400 if content interests or presentation style are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/enhanced-articles');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Content interests and presentation style are required');
    });

    it('should return pre-computed articles when available', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
          })
        }
      };
      
      mockCreateClientForServer.mockResolvedValue(mockSupabase as any);
      
      // Mock pre-computed articles
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'enhanced-1',
            user_id: 'user-123',
            gen_article_id: 'article-1',
            title: 'Test Article 1',
            content: 'Enhanced content 1',
            citations: [],
            content_preferences_hash: 'hash1',
            style_preferences_hash: 'hash2',
            similarity_score: null,
            generated_at: '2024-01-01T00:00:00Z',
            expires_at: null,
            enhancement_metadata: {}
          }
        ],
        error: null
      });

      const request = new NextRequest(
        'http://localhost:3000/api/enhanced-articles?interests=AI&style=executive&userId=user-123'
      );
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.articles).toHaveLength(1);
      expect(data.source).toBe('pre-computed');
    });

    it('should enhance articles on-demand when pre-computed not available', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [], // No pre-computed articles
          error: null
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
          })
        }
      };
      
      mockCreateClientForServer.mockResolvedValue(mockSupabase as any);
      
      // Mock vector search results
      mockPerformVectorSearch.mockResolvedValue([
        {
          article_id: 'article-1',
          title: 'Test Article',
          content: 'Original content',
          date: new Date(),
          fingerprint: 'fp1',
          tag: 'CLUSTER',
          citations: []
        }
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/enhanced-articles?interests=AI&style=executive&userId=user-123'
      );
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.articles).toHaveLength(1);
      expect(data.source).toBe('hybrid');
      expect(data.partiallyPreComputed).toBe(false);
    });

    it('should return 429 when refresh limit is exceeded', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'refresh-1' }, // User has already refreshed today
          error: null
        }),
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
          })
        }
      };
      
      mockCreateClientForServer.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest(
        'http://localhost:3000/api/enhanced-articles?interests=AI&style=executive&userId=user-123&forceRefresh=true'
      );
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(429);
      expect(data.error).toBe('Daily refresh limit reached');
      expect(data.refreshesRemaining).toBe(0);
    });
  });
}); 