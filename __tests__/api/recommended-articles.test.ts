/**
 * @jest-environment node
 */

// Mock dependencies - must be at the very top before any imports
jest.mock('@/lib/fetchArticles', () => ({
  getGeneratedArticle: jest.fn(),
}));

jest.mock('@/lib/vectorSearch', () => ({
  performVectorSearch: jest.fn(),
}));

import { GET, POST } from '@/app/api/recommended-articles/route';
import { NextRequest, NextResponse } from 'next/server';
import { getGeneratedArticle } from '@/lib/fetchArticles';
import { performVectorSearch } from '@/lib/vectorSearch';

const mockGetGeneratedArticle = getGeneratedArticle as jest.MockedFunction<typeof getGeneratedArticle>;
const mockPerformVectorSearch = performVectorSearch as jest.MockedFunction<typeof performVectorSearch>;

// Mock article data
const mockArticle = {
  article_id: 'test-article-1',
  title: 'Test Article',
  content: 'This is test article content for similarity search',
  date: new Date('2024-01-01'),
  fingerprint: 'test-fingerprint',
  tag: 'VDB_IMPROVED',
  citations: []
};

const mockSimilarArticles = [
  {
    article_id: 'similar-1',
    title: 'Similar Article 1',
    content: 'Similar content 1',
    date: new Date('2024-01-02'),
    fingerprint: 'fingerprint-1',
    tag: 'VDB_IMPROVED',
    citations: []
  },
  {
    article_id: 'similar-2', 
    title: 'Similar Article 2',
    content: 'Similar content 2',
    date: new Date('2024-01-03'),
    fingerprint: 'fingerprint-2',
    tag: 'VDB_IMPROVED',
    citations: []
  },
  {
    article_id: 'test-article-1', // This should be filtered out
    title: 'Test Article',
    content: 'This is test article content for similarity search',
    date: new Date('2024-01-01'),
    fingerprint: 'test-fingerprint',
    tag: 'VDB_IMPROVED',
    citations: []
  },
  {
    article_id: 'similar-3',
    title: 'Similar Article 3', 
    content: 'Similar content 3',
    date: new Date('2024-01-04'),
    fingerprint: 'fingerprint-3',
    tag: 'VDB_IMPROVED',
    citations: []
  }
];

describe('/api/recommended-articles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return recommended articles for valid request', async () => {
      mockGetGeneratedArticle.mockResolvedValue(mockArticle);
      mockPerformVectorSearch.mockResolvedValue(mockSimilarArticles);

      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'test-article-1',
          limit: 3
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toHaveLength(3);
      expect(data.articles[0].article_id).toBe('similar-1');
      expect(data.articles[1].article_id).toBe('similar-2');
      expect(data.articles[2].article_id).toBe('similar-3');
      
      // Verify current article is excluded
      expect(data.articles.find((a: any) => a.article_id === 'test-article-1')).toBeUndefined();
    });

    it('should exclude recently visited articles', async () => {
      mockGetGeneratedArticle.mockResolvedValue(mockArticle);
      mockPerformVectorSearch.mockResolvedValue(mockSimilarArticles);

      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'test-article-1',
          excludeIds: ['similar-1', 'similar-3'],
          limit: 3
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toHaveLength(1);
      expect(data.articles[0].article_id).toBe('similar-2');
    });

    it('should use default limit of 3 when not specified', async () => {
      mockGetGeneratedArticle.mockResolvedValue(mockArticle);
      mockPerformVectorSearch.mockResolvedValue(mockSimilarArticles);

      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'test-article-1'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toHaveLength(3);
    });

    it('should return 400 for missing articleId', async () => {
      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 3
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Article ID is required');
    });

    it('should return 404 when article not found', async () => {
      mockGetGeneratedArticle.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'non-existent'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Article not found');
    });

    it('should handle vector search failure gracefully', async () => {
      mockGetGeneratedArticle.mockResolvedValue(mockArticle);
      mockPerformVectorSearch.mockResolvedValue([]); // Empty results

      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'test-article-1'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toEqual([]);
    });

    it('should call vector search with correct multiplier', async () => {
      mockGetGeneratedArticle.mockResolvedValue(mockArticle);
      mockPerformVectorSearch.mockResolvedValue(mockSimilarArticles);

      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'test-article-1',
          limit: 3
        })
      });

      await POST(request);

      expect(mockPerformVectorSearch).toHaveBeenCalledWith(
        mockArticle.content,
        15 // 3 * 5 (multiplier should be at least 5 to ensure enough results)
      );
    });

    it('should handle invalid JSON gracefully', async () => {
      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });
  });

  describe('GET', () => {
    it('should return 405 for GET requests', async () => {
      const request = new NextRequest('http://localhost/api/recommended-articles', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });
}); 