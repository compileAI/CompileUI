import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/utils/chatMessages';
import { getApiUser } from '@/lib/auth0User';

export async function GET(request: NextRequest) {
  try {
    // Get Auth0 user
    const { data: { user }, error: userError } = await getApiUser();

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

    // Get chat history - use Auth0 user.sub instead of user.id
    const result = await getChatHistory({
      user_id: user.sub,
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