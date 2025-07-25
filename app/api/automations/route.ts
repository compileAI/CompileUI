import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRoutes } from '@/utils/supabase/server';
import { 
  AutomationsApiResponse, 
  AutomationApiResponse, 
  CreateAutomationRequest,
  Automation 
} from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<AutomationsApiResponse>> {
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

      return NextResponse.json({
        success: true,
        automations: typedDemoAutomations
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

    return NextResponse.json({
      success: true,
      automations: typedAutomations
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

    // Upsert automation (update if exists for this user/card combination)
    const { data: automation, error: upsertError } = await supabase
      .from('automations')
      .upsert({
        user_id: user.id,
        type: body.type,
        params: body.params,
        card_number: body.card_number,
        active: body.active ?? true
      }, {
        onConflict: 'user_id,card_number'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting automation:', upsertError);
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