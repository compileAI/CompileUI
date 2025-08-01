import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRoutes } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  AutomationsApiResponse, 
  AutomationApiResponse, 
  CreateAutomationRequest,
  Automation,
  AutomationWithContent,
  AutomationContent
} from '@/types';

// Interface for database automation content record
interface DatabaseAutomationContent {
  id: string | number;
  automation_id: string | number;
  card_number: number;
  title: string;
  content: string;
  created_at: string;
  user_id: string | null;
}

// Helper function to fetch today's content for multiple automations
async function fetchAutomationContent(
  supabase: SupabaseClient,
  userId: string | null,
  cardNumbers: number[]
): Promise<Record<number, AutomationContent | null>> {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const contentMap: Record<number, AutomationContent | null> = {};

  try {
    // Fetch content for all card numbers in one query
    const query = supabase
      .from('automation_content')
      .select('*')
      .in('card_number', cardNumbers)
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false });

    // Filter by user_id (null for demo, specific user for authenticated)
    if (userId) {
      query.eq('user_id', userId);
    } else {
      query.is('user_id', null);
    }

    const { data: contentArray, error } = await query;

    if (error) {
      console.error('Error fetching automation content:', error);
      // Return empty map on error - content will be null for all
      cardNumbers.forEach(cardNumber => {
        contentMap[cardNumber] = null;
      });
      return contentMap;
    }

    // Initialize all card numbers to null
    cardNumbers.forEach(cardNumber => {
      contentMap[cardNumber] = null;
    });

    // Populate with found content (convert id fields to strings)
    if (contentArray) {
      contentArray.forEach((content: DatabaseAutomationContent) => {
        contentMap[content.card_number] = {
          id: content.id.toString(),
          automation_id: content.automation_id.toString(),
          user_id: content.user_id || '', // Handle null user_id for demo content
          card_number: content.card_number,
          title: content.title,
          content: content.content,
          created_at: content.created_at
        };
      });
    }

    return contentMap;
  } catch (error) {
    console.error('Unexpected error fetching automation content:', error);
    // Return null content for all on error
    cardNumbers.forEach(cardNumber => {
      contentMap[cardNumber] = null;
    });
    return contentMap;
  }
}

export async function GET(): Promise<NextResponse<AutomationsApiResponse>> {
  try {
    const supabase = await createServerClientForRoutes();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // If no user is authenticated, return demo automations
    if (userError || !user) {
      console.log('No authenticated user, returning demo automations');
      
      // Fetch demo automations using NULL user_id (demo automations)
      const { data: demoAutomations, error: demoError } = await supabase
        .from('automations')
        .select('*')
        .is('user_id', null)
        .eq('active', true)
        .order('card_number', { ascending: true });

      if (demoError) {
        console.error('Error fetching demo automations:', demoError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch demo automations' },
          { status: 500 }
        );
      }

      // Convert database format to our types (id as string)
      const typedDemoAutomations: Automation[] = (demoAutomations || []).map(automation => ({
        ...automation,
        id: automation.id.toString()
      }));

      // Fetch content for all demo automations
      const cardNumbers = typedDemoAutomations.map(automation => automation.card_number);
      const contentMap = await fetchAutomationContent(supabase, null, cardNumbers);

      // Combine automations with their content
      const automationsWithContent: AutomationWithContent[] = typedDemoAutomations.map(automation => ({
        ...automation,
        content: contentMap[automation.card_number] || null
      }));

      return NextResponse.json({
        success: true,
        automations: automationsWithContent
      });
    }

    // Fetch user's automations
    const { data: automations, error: automationsError } = await supabase
      .from('automations')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('card_number', { ascending: true });

    if (automationsError) {
      console.error('Error fetching automations:', automationsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch automations' },
        { status: 500 }
      );
    }

    // Convert database format to our types (id as string)
    const typedAutomations: Automation[] = (automations || []).map(automation => ({
      ...automation,
      id: automation.id.toString()
    }));

    // Fetch content for all user automations
    const cardNumbers = typedAutomations.map(automation => automation.card_number);
    const contentMap = await fetchAutomationContent(supabase, user.id, cardNumbers);

    // Combine automations with their content
    const automationsWithContent: AutomationWithContent[] = typedAutomations.map(automation => ({
      ...automation,
      content: contentMap[automation.card_number] || null
    }));

    return NextResponse.json({
      success: true,
      automations: automationsWithContent
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/automations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AutomationApiResponse>> {
  try {
    const supabase = await createServerClientForRoutes();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error in POST /api/automations:', userError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateAutomationRequest = await request.json();
    
    // Validate required fields
    if (!body.type || !body.params || body.card_number === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate automation params
    if (!body.params.retrieval_prompt || !body.params.content_prompt || !body.params.style_prompt) {
      return NextResponse.json(
        { success: false, error: 'All prompt fields are required' },
        { status: 400 }
      );
    }

    // Validate card number range (0-5 for 6 cards)
    if (body.card_number < 0 || body.card_number > 5) {
      return NextResponse.json(
        { success: false, error: 'Card number must be between 0 and 5' },
        { status: 400 }
      );
    }

    // Check if automation already exists for this user/card combination
    const { data: existingAutomation, error: fetchError } = await supabase
      .from('automations')
      .select('id')
      .eq('user_id', user.id)
      .eq('card_number', body.card_number)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing automation:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to check existing automation' },
        { status: 500 }
      );
    }

    let automation;
    let operationError;

    if (existingAutomation) {
      // Update existing automation
      const { data, error } = await supabase
        .from('automations')
        .update({
          type: body.type,
          params: body.params,
          active: body.active ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('card_number', body.card_number)
        .select()
        .single();
      
      automation = data;
      operationError = error;
    } else {
      // Insert new automation
      const { data, error } = await supabase
        .from('automations')
        .insert({
          user_id: user.id,
          type: body.type,
          params: body.params,
          card_number: body.card_number,
          active: body.active ?? true
        })
        .select()
        .single();
      
      automation = data;
      operationError = error;
    }

    if (operationError) {
      console.error('Error saving automation:', operationError);
      return NextResponse.json(
        { success: false, error: 'Failed to save automation' },
        { status: 500 }
      );
    }

    // Convert database format to our types (id as string)
    const typedAutomation: Automation = {
      ...automation,
      id: automation.id.toString()
    };

    return NextResponse.json({
      success: true,
      automation: typedAutomation
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/automations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 