import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRoutes } from '@/utils/supabase/server';
import { AutomationContentApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardNumber: string }> }
): Promise<NextResponse<AutomationContentApiResponse>> {
  try {
    const supabase = await createServerClientForRoutes();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    const { cardNumber: cardNumberStr } = await params;
    const cardNumber = parseInt(cardNumberStr);

    // Validate card number
    if (isNaN(cardNumber) || cardNumber < 0 || cardNumber > 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid card number' },
        { status: 400 }
      );
    }

    // Get today's date in UTC for comparison
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // If no user is authenticated, return demo content
    if (userError || !user) {
      console.log('No authenticated user, returning demo content');
      
      // Fetch demo content using NULL user_id (demo content)
      const { data: demoContent, error: demoContentError } = await supabase
        .from('automation_content')
        .select('*')
        .is('user_id', null)
        .eq('card_number', cardNumber)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (demoContentError) {
        if (demoContentError.code === 'PGRST116') {
          // No demo content found for today
          return NextResponse.json({
            success: true,
            content: null
          });
        }
        
        console.error('Error fetching demo content:', demoContentError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch demo content' },
          { status: 500 }
        );
      }

      // Convert database format to our types (id as string)
      const typedDemoContent = {
        ...demoContent,
        id: demoContent.id.toString(),
        automation_id: demoContent.automation_id.toString()
      };

      return NextResponse.json({
        success: true,
        content: typedDemoContent
      });
    }

    // Fetch today's automation content for this card (authenticated user)
    const { data: content, error: contentError } = await supabase
      .from('automation_content')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_number', cardNumber)
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (contentError) {
      if (contentError.code === 'PGRST116') {
        // No content found for today
        return NextResponse.json({
          success: true,
          content: null
        });
      }
      
      if (contentError.code === '42P01') {
        // Table doesn't exist yet - this is expected during development
        console.log('automation_content table does not exist yet, returning null content');
        return NextResponse.json({
          success: true,
          content: null
        });
      }
      
      console.error('Error fetching automation content:', contentError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch automation content' },
        { status: 500 }
      );
    }

    // Convert database format to our types (id as string)
    const typedContent = {
      ...content,
      id: content.id.toString(),
      automation_id: content.automation_id.toString()
    };

    return NextResponse.json({
      success: true,
      content: typedContent
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/automation-content/[cardNumber]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 