import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth0User';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { AutomationContentApiResponse } from '@/types';

// Interface for nested citation structure from database
interface DatabaseCitation {
  snippet: string;
  source_article_id: string;
  source_articles?: {
    title: string;
    url: string;
    master_sources?: {
      name: string;
    };
  };
}

// Interface for automation content from database
interface DatabaseAutomationContent {
  id: string | number;
  automation_id: string | number;
  card_number: number;
  title: string;
  content: string;
  created_at: string;
  user_id: string | null;
  automation_citations?: DatabaseCitation[];
  // New GenArticle fields
  fingerprint?: string;
  article_id?: string;
  tag?: string;
  date?: string;
  cluster_id?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardNumber: string }> }
): Promise<NextResponse<AutomationContentApiResponse>> {
  try {
    // Get Auth0 user
    const { data: { user }, error: userError } = await getApiUser();

    // Get Supabase client with Auth0 token
    const supabase = await createSupabaseServerClient();
    
    const { cardNumber: cardNumberStr } = await params;
    const cardNumber = parseInt(cardNumberStr);

    // Validate card number
    if (isNaN(cardNumber) || cardNumber < 0 || cardNumber > 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid card number' },
        { status: 400 }
      );
    }

    // Use a 24-hour rolling window instead of calendar day to avoid timezone issues
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = twentyFourHoursAgo;
    const todayEnd = now;

    // If no user is authenticated, return demo content
    if (userError || !user) {
      console.log('No authenticated user, returning demo content');
      
      // Fetch demo content using NULL user_id (demo content) with citations
      const { data: demoContent, error: demoContentError } = await supabase
        .from('automation_content')
        .select(`
          *,
          automation_citations (
            snippet,
            source_article_id,
            source_articles (
              title,
              url,
              master_sources (
                name
              )
            )
          )
        `)
        .is('user_id', null)
        .eq('card_number', cardNumber)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (demoContentError) {
        console.error('Error fetching demo content:', demoContentError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch demo content' },
          { status: 500 }
        );
      }

      if (!demoContent) {
        // No demo content found for today
        return NextResponse.json({
          success: true,
          content: null
        });
      }

      // Convert database format to our types (id as string) and process citations
      const citations = (demoContent as DatabaseAutomationContent).automation_citations?.map((citation: DatabaseCitation) => ({
        sourceName: citation.source_articles?.master_sources?.name || 'Unknown Source',
        articleTitle: citation.source_articles?.title || 'Untitled',
        snippet: citation.snippet,
        url: citation.source_articles?.url || null
      })) || [];

      const typedDemoContent = {
        id: demoContent.id.toString(),
        automation_id: demoContent.automation_id.toString(),
        user_id: demoContent.user_id || '',
        card_number: demoContent.card_number,
        title: demoContent.title,
        content: demoContent.content,
        created_at: demoContent.created_at,
        // New GenArticle fields
        fingerprint: demoContent.fingerprint || '',
        article_id: demoContent.article_id || '',
        citations: citations,
        tag: demoContent.tag || '',
        date: demoContent.date || demoContent.created_at,
        cluster_id: demoContent.cluster_id || null
      };

      return NextResponse.json({
        success: true,
        content: typedDemoContent
      });
    }

    // Fetch today's automation content for this card (authenticated user) with citations
    const { data: content, error: contentError } = await supabase
      .from('automation_content')
      .select(`
        *,
        automation_citations (
          snippet,
          source_article_id,
          source_articles (
            title,
            url,
            master_sources (
              name
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('card_number', cardNumber)
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contentError) {
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

    if (!content) {
      // No content found for today
      return NextResponse.json({
        success: true,
        content: null
      });
    }

    // Convert database format to our types (id as string) and process citations
    const citations = (content as DatabaseAutomationContent).automation_citations?.map((citation: DatabaseCitation) => ({
      sourceName: citation.source_articles?.master_sources?.name || 'Unknown Source',
      articleTitle: citation.source_articles?.title || 'Untitled',
      snippet: citation.snippet,
      url: citation.source_articles?.url || null
    })) || [];

    const typedContent = {
      id: content.id.toString(),
      automation_id: content.automation_id.toString(),
      user_id: content.user_id || '',
      card_number: content.card_number,
      title: content.title,
      content: content.content,
      created_at: content.created_at,
      // New GenArticle fields
      fingerprint: content.fingerprint || '',
      article_id: content.article_id || '',
      citations: citations,
      tag: content.tag || '',
      date: content.date || content.created_at,
      cluster_id: content.cluster_id || null
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