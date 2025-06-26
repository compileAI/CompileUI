/**
 * @jest-environment node
 */

import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/utils/chatMessages');
jest.mock('@google/genai');

const mockCreateClientForServer = require('@/utils/supabase/server').createClientForServer;
const mockSaveChatMessageAsync = require('@/utils/chatMessages').saveChatMessageAsync;
const mockGoogleGenAI = require('@google/genai').GoogleGenAI;

describe('/api/chat with FAQ context', () => {
  beforeEach(() => {
    // Mock Supabase client
    const mockSupabase = {
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null
        }))
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      }))
    };
    mockCreateClientForServer.mockResolvedValue(mockSupabase);

    // Mock chat message saving
    mockSaveChatMessageAsync.mockResolvedValue();

    // Mock GoogleGenAI
    const mockGenerateContent = jest.fn(() => Promise.resolve({
      response: {
        text: () => 'This is a mock AI response about the FAQ topic.'
      }
    }));
    
    mockGoogleGenAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent
      })
    }));

    // Set required environment variable
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle FAQ context in chat request', async () => {
    const requestBody = {
      message: 'What is the main topic?',
      history: [],
      articleContext: {
        article_id: '123',
        title: 'Test Article',
        content: 'This is test article content.'
      },
      faqContext: 'The main topic is artificial intelligence and its applications in modern technology.'
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(typeof data.message).toBe('string');
  });

  it('should work without FAQ context (backwards compatibility)', async () => {
    const requestBody = {
      message: 'What is this article about?',
      history: [],
      articleContext: {
        article_id: '123',
        title: 'Test Article',
        content: 'This is test article content.'
      }
      // No faqContext provided
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(typeof data.message).toBe('string');
  });

  it('should validate required fields', async () => {
    const requestBody = {
      message: '',
      history: [],
      articleContext: {
        article_id: '123',
        title: 'Test Article',
        content: 'This is test article content.'
      }
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Message is required');
  });
}); 