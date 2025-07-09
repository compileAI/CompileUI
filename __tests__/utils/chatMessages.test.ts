import { saveChatMessage, getChatHistory, convertDatabaseMessageToUI } from '@/utils/chatMessages';
import { createClientForServer } from '@/utils/supabase/server';
import { DatabaseChatMessage, SaveChatMessageParams, ChatHistoryParams } from '@/types';

// Mock the Supabase client
jest.mock('@/utils/supabase/server');
const mockCreateClientForServer = createClientForServer as jest.MockedFunction<typeof createClientForServer>;

describe('Chat Messages Database Utilities', () => {
  let mockSupabaseClient: {
    from: jest.Mock;
    auth: {
      getUser: jest.Mock;
    };
  };

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    };
    mockCreateClientForServer.mockResolvedValue(mockSupabaseClient as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveChatMessage', () => {
    const mockSaveParams: SaveChatMessageParams = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      article_id: '98765432109876543210',
      message_id: 'msg_12345',
      role: 'user',
      content: 'Test message content'
    };

    it('should save a chat message successfully', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: '1',
              ...mockSaveParams,
              created_at: '2024-01-01T12:00:00Z'
            },
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      const result = await saveChatMessage(mockSaveParams);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_chat_messages');
      expect(mockInsert).toHaveBeenCalledWith(mockSaveParams);
      expect(result.success).toBe(true);
      expect(result.data?.message_id).toBe(mockSaveParams.message_id);
    });

    it('should handle database errors gracefully', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error', code: 'DB_ERROR' }
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      const result = await saveChatMessage(mockSaveParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should handle network/connection errors', async () => {
      mockCreateClientForServer.mockRejectedValue(new Error('Connection failed'));

      const result = await saveChatMessage(mockSaveParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    it('should validate required parameters', async () => {
      const invalidParams = {
        ...mockSaveParams,
        user_id: '',  // Empty user_id should fail
      };

      const result = await saveChatMessage(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('user_id is required');
    });
  });

  describe('getChatHistory', () => {
    const mockHistoryParams: ChatHistoryParams = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      article_id: '98765432109876543210'
    };

    const mockDatabaseMessages: DatabaseChatMessage[] = [
      {
        id: '1',
        user_id: mockHistoryParams.user_id,
        article_id: mockHistoryParams.article_id,
        message_id: 'msg_1',
        role: 'user',
        content: 'First message',
        created_at: '2024-01-01T12:00:00Z'
      },
      {
        id: '2',
        user_id: mockHistoryParams.user_id,
        article_id: mockHistoryParams.article_id,
        message_id: 'msg_2',
        role: 'assistant',
        content: 'Assistant response',
        created_at: '2024-01-01T12:01:00Z'
      }
    ];

    it('should retrieve chat history successfully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockDatabaseMessages,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await getChatHistory(mockHistoryParams);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_chat_messages');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].role).toBe('user');
      expect(result.data?.[1].role).toBe('assistant');
    });

    it('should return empty array for new conversations', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await getChatHistory(mockHistoryParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors when retrieving history', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed', code: 'QUERY_ERROR' }
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await getChatHistory(mockHistoryParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });

    it('should order messages by created_at ascending', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockDatabaseMessages,
        error: null
      });

      const mockEq2 = jest.fn().mockReturnValue({
        order: mockOrder
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      await getChatHistory(mockHistoryParams);

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });

  describe('convertDatabaseMessageToUI', () => {
    it('should convert database message to UI format', () => {
      const dbMessage: DatabaseChatMessage = {
        id: '1',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        article_id: '98765432109876543210',
        message_id: 'msg_1',
        role: 'user',
        content: 'Test message',
        created_at: '2024-01-01T12:00:00Z'
      };

      const uiMessage = convertDatabaseMessageToUI(dbMessage);

      expect(uiMessage.id).toBe(dbMessage.message_id);
      expect(uiMessage.role).toBe(dbMessage.role);
      expect(uiMessage.content).toBe(dbMessage.content);
      expect(uiMessage.timestamp).toEqual(new Date(dbMessage.created_at));
    });

    it('should handle assistant role correctly', () => {
      const dbMessage: DatabaseChatMessage = {
        id: '2',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        article_id: '98765432109876543210',
        message_id: 'msg_2',
        role: 'assistant',
        content: 'Assistant response',
        created_at: '2024-01-01T12:01:00Z'
      };

      const uiMessage = convertDatabaseMessageToUI(dbMessage);

      expect(uiMessage.role).toBe('assistant');
    });
  });
}); 