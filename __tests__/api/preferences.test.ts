/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/preferences/route';
import { NextRequest } from 'next/server';
import { createServerClientForRoutes } from '@/utils/supabase/server';

// Mock Supabase server client
jest.mock('@/utils/supabase/server', () => ({
  createServerClientForRoutes: jest.fn(),
}));

const mockCreateServerClientForRoutes = createServerClientForRoutes as jest.MockedFunction<typeof createServerClientForRoutes>;

describe('/api/preferences', () => {
  let mockSupabase: any;
  let mockSingle: jest.Mock;
  let mockEq: jest.Mock;
  let mockSelect: jest.Mock;
  let mockUpsert: jest.Mock;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    mockSingle = jest.fn();
    mockEq = jest.fn(() => ({ single: mockSingle }));
    mockSelect = jest.fn(() => ({ eq: mockEq, single: mockSingle }));
    mockUpsert = jest.fn(() => ({ select: mockSelect }));
    mockFrom = jest.fn(() => ({ 
      select: mockSelect,
      upsert: mockUpsert 
    }));

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: mockFrom,
    };
    
    mockCreateServerClientForRoutes.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return empty preferences when user has no saved preferences', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      });

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences).toBeUndefined();
    });

    it('should return user preferences when they exist', async () => {
      const mockPreferences = {
        content_preferences: 'AI news and updates',
        style_preferences: 'Concise summaries with key points',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences).toEqual(mockPreferences);
    });

    it('should return 500 when database query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'SOME_ERROR', message: 'Database error' },
      });

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch preferences');
    });
  });

  describe('POST', () => {
    const mockRequestBody = {
      content_preferences: 'AI and tech news',
      style_preferences: 'Brief summaries with actionable insights',
    };

    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify(mockRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when required fields are missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const incompleteBody = {
        content_preferences: 'AI news',
        // Missing style_preferences
      };

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify(incompleteBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
    });

    it('should successfully save preferences', async () => {
      const savedPreferences = {
        content_preferences: mockRequestBody.content_preferences,
        style_preferences: mockRequestBody.style_preferences,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: savedPreferences,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify(mockRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences).toEqual(savedPreferences);

      // Verify the upsert was called with correct data
      expect(mockFrom).toHaveBeenCalledWith('user_preferences');
      expect(mockUpsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        content_preferences: mockRequestBody.content_preferences,
        style_preferences: mockRequestBody.style_preferences,
      });
    });

    it('should return 500 when database upsert fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify(mockRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to save preferences');
    });
  });
}); 