import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth0User';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { AutomationApiResponse } from '@/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AutomationApiResponse>> {
  try {
    // Get Auth0 user
    const { data: { user }, error: userError } = await getApiUser();
    
    if (userError || !user) {
      console.error('Auth error in DELETE /api/automations/[id]:', userError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Supabase client with Auth0 token
    const supabase = await createSupabaseServerClient();

    const { id: automationId } = await params;

    // First check if automation exists and belongs to user
    const { data: existingAutomation, error: fetchError } = await supabase
      .from('automations')
      .select('id, user_id')
      .eq('id', automationId)
      .single();

    if (fetchError || !existingAutomation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found' },
        { status: 404 }
      );
    }

    if (existingAutomation.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Soft delete by setting active to false
    const { error: deleteError } = await supabase
      .from('automations')
      .update({ active: false })
      .eq('id', automationId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting automation:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete automation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/automations/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 