import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/utils/chatMessages';
import { createClientForServer } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createClientForServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get article_id from query parameters
    const { searchParams } = new URL(request.url);
    const article_id = searchParams.get('article_id');

    if (!article_id) {
      return NextResponse.json(
        { success: false, error: 'article_id is required' },
        { status: 400 }
      );
    }

    // Get chat history
    const result = await getChatHistory({
      user_id: user.id,
      article_id: article_id
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: result.data || []
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/chat-history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 