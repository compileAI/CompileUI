/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/refresh/route';
import { NextRequest } from 'next/server';
import { createServerClientForRoutes } from '@/utils/supabase/server';

// Mock Supabase server client
jest.mock('@/utils/supabase/server', () => ({
  createServerClientForRoutes: jest.fn(),
}));

const mockCreateServerClientForRoutes = createServerClientForRoutes as jest.MockedFunction<typeof createServerClientForRoutes>;

describe('/api/refresh', () => {
  let mockSupabase: any;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockInsert: jest.Mock;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    mockSelect = jest.fn(() => ({ eq: mockEq }));
    mockEq = jest.fn(() => ({ eq: mockEq }));
    mockInsert = jest.fn();
    mockFrom = jest.fn(() => ({ 
      select: mockSelect,
      insert: mockInsert 
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

      const request = new NextRequest('http://localhost:3000/api/refresh', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return refresh count when user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockEq.mockResolvedValue({
        data: [{ id: 'refresh-1' }, { id: 'refresh-2' }], // 2 refreshes used
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/refresh', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.refreshesRemaining).toBe(1); // 3 - 2 = 1 remaining
    });

    it('should return 0 refreshes when limit is reached', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockEq.mockResolvedValue({
        data: [{ id: 'refresh-1' }, { id: 'refresh-2' }, { id: 'refresh-3' }], // 3 refreshes used
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/refresh', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.refreshesRemaining).toBe(0);
    });
  });

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/refresh', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should successfully record a refresh when under limit', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock existing refreshes (1 used)
      mockEq.mockResolvedValueOnce({
        data: [{ id: 'refresh-1' }],
        error: null,
      });

      // Mock successful insert
      mockInsert.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/refresh', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared successfully');
      expect(data.refreshesRemaining).toBe(1); // 3 - 1 - 1 = 1 remaining

      // Verify the insert was called
      expect(mockFrom).toHaveBeenCalledWith('user_refreshes');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        refresh_date: expect.any(String), // Should be current date in EST
      });
    });

    it('should return 429 when daily limit is reached', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock existing refreshes (3 used - limit reached)
      mockEq.mockResolvedValueOnce({
        data: [{ id: 'refresh-1' }, { id: 'refresh-2' }, { id: 'refresh-3' }],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/refresh', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Daily refresh limit reached');
      expect(data.refreshesRemaining).toBe(0);

      // Verify insert was not called
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should return 500 when database insert fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock existing refreshes (1 used)
      mockEq.mockResolvedValueOnce({
        data: [{ id: 'refresh-1' }],
        error: null,
      });

      // Mock failed insert
      mockInsert.mockResolvedValue({
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost:3000/api/refresh', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to record refresh');
    });
  });
}); 