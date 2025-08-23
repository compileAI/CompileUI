import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { AutomationsApiResponse, Automation } from '@/types';

export async function GET(): Promise<NextResponse<AutomationsApiResponse>> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Fetch general automations (user_id is null for default/general automations)
    const { data: automations, error: automationsError } = await supabase
      .from('automations')
      .select('*')
      .is('user_id', null)
      .eq('active', true)
      .order('card_number', { ascending: true });

    if (automationsError) {
      console.error('Error fetching general automations:', automationsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch general automations' },
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
    console.error('Unexpected error in GET /api/automations/general:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 