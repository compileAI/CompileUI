import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { DatabaseChatMessage, SaveChatMessageParams, ChatHistoryParams, ChatMessage } from '@/types';
import { logger } from '@/lib/logger';

export interface ChatMessageResult {
  success: boolean;
  data?: DatabaseChatMessage;
  error?: string;
}

export interface ChatHistoryResult {
  success: boolean;
  data?: ChatMessage[];
  error?: string;
}

/**
 * Save a chat message to the database
 */
export async function saveChatMessage(params: SaveChatMessageParams): Promise<ChatMessageResult> {
  try {
    // Validate required parameters
    if (!params.user_id || params.user_id.trim() === '') {
      return {
        success: false,
        error: 'user_id is required'
      };
    }

    if (!params.article_id || params.article_id.trim() === '') {
      return {
        success: false,
        error: 'article_id is required'
      };
    }

    if (!params.message_id || params.message_id.trim() === '') {
      return {
        success: false,
        error: 'message_id is required'
      };
    }

    if (!params.content || params.content.trim() === '') {
      return {
        success: false,
        error: 'content is required'
      };
    }

    if (!params.role || !['user', 'assistant'].includes(params.role)) {
      return {
        success: false,
        error: 'role must be either "user" or "assistant"'
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('user_chat_messages')
      .insert(params)
      .select()
      .single();

    if (error) {
      logger.error('chatMessages', 'Error saving chat message', { error: String(error) });
      return {
        success: false,
        error: `Failed to save message: ${error.message}`
      };
    }

    return {
      success: true,
      data: data as DatabaseChatMessage
    };
  } catch (error) {
    logger.error('chatMessages', 'Unexpected error saving chat message', { error: String(error) });
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get chat history for a user-article pair
 */
export async function getChatHistory(params: ChatHistoryParams): Promise<ChatHistoryResult> {
  try {
    // Validate required parameters
    if (!params.user_id || params.user_id.trim() === '') {
      return {
        success: false,
        error: 'user_id is required'
      };
    }

    if (!params.article_id || params.article_id.trim() === '') {
      return {
        success: false,
        error: 'article_id is required'
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('user_chat_messages')
      .select('*')
      .eq('user_id', params.user_id)
      .eq('article_id', params.article_id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('chatMessages', 'Error retrieving chat history', { error: String(error) });
      return {
        success: false,
        error: `Failed to retrieve chat history: ${error.message}`
      };
    }

    // Convert database messages to UI format
    const uiMessages = (data as DatabaseChatMessage[]).map(convertDatabaseMessageToUI);

    return {
      success: true,
      data: uiMessages
    };
  } catch (error) {
    logger.error('chatMessages', 'Unexpected error retrieving chat history', { error: String(error) });
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Convert a database message to UI format
 */
export function convertDatabaseMessageToUI(dbMessage: DatabaseChatMessage): ChatMessage {
  return {
    id: dbMessage.message_id,
    role: dbMessage.role,
    content: dbMessage.content,
    timestamp: new Date(dbMessage.created_at)
  };
}

/**
 * Async function to save chat message without blocking the UI
 * This is used for fire-and-forget saves
 */
export async function saveChatMessageAsync(params: SaveChatMessageParams): Promise<void> {
  try {
    const result = await saveChatMessage(params);
    if (!result.success) {
      logger.error('chatMessages', 'Async chat message save failed', { error: result.error });
    }
  } catch (error) {
    logger.error('chatMessages', 'Async chat message save error', { error: String(error) });
  }
} 