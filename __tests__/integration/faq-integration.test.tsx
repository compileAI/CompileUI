/**
 * @jest-environment node
 */

import { GET } from '@/app/api/faqs/route';
import { NextRequest } from 'next/server';
import { selectFAQs, fetchFAQsForArticle } from '@/lib/fetchFAQs';
import { FAQ } from '@/types';

// Mock dependencies
jest.mock('@/utils/supabase/server');
const mockCreateClientForServer = require('@/utils/supabase/server').createClientForServer;

describe('FAQ Integration', () => {
  const mockFAQs: FAQ[] = [
    {
      id: 'faq-1',
      gen_article_id: '123',
      question: 'What is the main topic?',
      answer: 'The main topic is AI.',
      created_at: '2024-01-01T12:00:00Z',
      question_short: 'Main topic?'
    },
    {
      id: 'faq-2',
      gen_article_id: '123',
      question: 'How does this work?',
      answer: 'It works through algorithms.',
      created_at: '2024-01-01T12:01:00Z',
      question_short: 'How does it work?'
    },
    {
      id: 'faq-3',
      gen_article_id: '123',
      question: 'What are the benefits?',
      answer: 'The benefits include efficiency.',
      created_at: '2024-01-01T12:02:00Z',
      question_short: 'Benefits?'
    },
    {
      id: 'faq-4',
      gen_article_id: '123',
      question: 'What are the limitations?',
      answer: 'Limitations include complexity.',
      created_at: '2024-01-01T12:03:00Z',
      question_short: 'Limitations?'
    },
    {
      id: 'faq-5',
      gen_article_id: '123',
      question: 'Future prospects?',
      answer: 'Future looks promising.',
      created_at: '2024-01-01T12:04:00Z',
      question_short: 'Future?'
    }
  ];

  beforeEach(() => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: mockFAQs,
            error: null
          }))
        }))
      }))
    };
    mockCreateClientForServer.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should complete the full FAQ flow: API -> selection -> frontend ready', async () => {
    // Step 1: Test API endpoint
    const request = new NextRequest('http://localhost:3000/api/faqs?articleId=123');
    const response = await GET(request);
    const apiData = await response.json();

    expect(response.status).toBe(200);
    expect(apiData.success).toBe(true);
    expect(apiData.faqs).toHaveLength(5);

    // Step 2: Test deterministic selection
    const selectedFAQs = selectFAQs(mockFAQs, '123');
    expect(selectedFAQs).toHaveLength(3);
    
    // Verify deterministic behavior
    const selectedFAQs2 = selectFAQs(mockFAQs, '123');
    expect(selectedFAQs).toEqual(selectedFAQs2);

    // Step 3: Test different article ID gives different selection
    const differentSelection = selectFAQs(mockFAQs, '456');
    expect(differentSelection).toHaveLength(3);
    expect(differentSelection).not.toEqual(selectedFAQs);

    // Step 4: Verify all selected FAQs have required fields
    selectedFAQs.forEach(faq => {
      expect(faq).toHaveProperty('id');
      expect(faq).toHaveProperty('question');
      expect(faq).toHaveProperty('answer');
      expect(faq).toHaveProperty('question_short');
      expect(typeof faq.question_short).toBe('string');
      expect(faq.question_short.length).toBeGreaterThan(0);
    });
  });

  it('should handle edge cases properly', async () => {
    // Test with no FAQs
    const mockSupabaseEmpty = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      }))
    };
    mockCreateClientForServer.mockResolvedValue(mockSupabaseEmpty);

    const request = new NextRequest('http://localhost:3000/api/faqs?articleId=999');
    const response = await GET(request);
    const apiData = await response.json();

    expect(response.status).toBe(200);
    expect(apiData.success).toBe(true);
    expect(apiData.faqs).toHaveLength(0);

    // Test selection with empty array
    const selected = selectFAQs([], '999');
    expect(selected).toHaveLength(0);
  });

  it('should validate FAQ data structure', () => {
    // Verify our mock data matches the expected FAQ interface
    mockFAQs.forEach(faq => {
      expect(faq).toMatchObject({
        id: expect.any(String),
        gen_article_id: expect.any(String),
        question: expect.any(String),
        answer: expect.any(String),
        created_at: expect.any(String),
        question_short: expect.any(String)
      });
    });
  });
}); 