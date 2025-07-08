import { NextRequest, NextResponse } from "next/server";
import { createClientForServer } from "@/utils/supabase/server";
import { performVectorSearch } from "@/lib/vectorSearch";
import { GoogleGenAI } from "@google/genai";
import { Article } from "@/types";

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// Helper function to hash content preferences
function hashContentPreferences(contentInterests: string): string {
  // Simple hash function - in production you might want to use crypto
  return btoa(contentInterests.toLowerCase().trim()).slice(0, 64);
}

// Helper function to hash style preferences
function hashStylePreferences(presentationStyle: string): string {
  return btoa(presentationStyle.toLowerCase().trim()).slice(0, 64);
}

// Helper function to enhance a single article
async function enhanceArticle(article: Article, contentInterests: string, presentationStyle: string) {
  const enhancementPrompt = `You are an AI assistant that helps personalize and improve articles based on user preferences.

User's Content Interests: "${contentInterests}"
User's Preferred Presentation Style: "${presentationStyle}"

Original Article:
Title: ${article.title}
Content: ${article.content}

Please rewrite and enhance this article to better match the user's interests and presentation preferences. Keep the core information accurate, but:

1. Focus on aspects most relevant to their content interests
2. Apply their preferred presentation style throughout
3. Adjust the tone, structure, and emphasis to match their preferences
4. Add context or explanations that would be valuable to someone with their interests
5. Keep it concise but informative (aim for 2-3 paragraphs)
6. Maintain factual accuracy

Return only the enhanced article content, no additional formatting or explanations.`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: enhancementPrompt
  });
  
  return response.text;
}

// Helper function to save enhanced article to database
async function saveEnhancedArticle(data: {
  user_id: string | null;
  gen_article_id: string | null;
  title: string;
  content: string;
  citations: unknown;
  content_preferences_hash: string;
  style_preferences_hash: string;
  content_preferences: string;
  style_preferences: string;
  enhancement_metadata: unknown;
}) {
  const supabase = await createClientForServer();
  
  const { error } = await supabase
    .from('enhanced_articles')
    .upsert({
      ...data,
      similarity_score: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

  if (error) {
    console.error('Error saving enhanced article:', error);
    throw error;
  }
}

// Helper function to check user refresh limit
async function checkUserRefreshLimit(userId: string): Promise<{ canRefresh: boolean; refreshesRemaining: number }> {
  const supabase = await createClientForServer();
  const today = getCurrentESTDate();
  
  console.log(`[DEBUG] Checking refresh limit for user ${userId} on date: ${today}`);
  
  // Count today's refresh records for this user
  const { count: refreshCount, error: countError } = await supabase
    .from('user_refreshes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('refresh_date', today);

  if (countError) {
    console.error('Error checking refresh limit:', countError);
    return { canRefresh: false, refreshesRemaining: 0 };
  }

  const actualRefreshCount = refreshCount || 0;
  const canRefresh = actualRefreshCount < 3;
  const refreshesRemaining = Math.max(0, 3 - actualRefreshCount);

  console.log(`[DEBUG] Found ${actualRefreshCount} refreshes, canRefresh: ${canRefresh}, remaining: ${refreshesRemaining}`);

  return { canRefresh, refreshesRemaining };
}

// Helper function to record a refresh
async function recordUserRefresh(userId: string) {
  const supabase = await createClientForServer();
  const today = getCurrentESTDate();
  
  // Insert new refresh record
  const { error: insertError } = await supabase
    .from('user_refreshes')
    .insert({
      user_id: userId,
      refresh_date: today
    });

  if (insertError) {
    console.error('Error recording user refresh:', insertError);
    throw insertError;
  }
}

// Convert current time to EST
function getCurrentESTDate(): string {
  const now = new Date();
  const estOffset = -5; // EST is UTC-5
  const estTime = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  return estTime.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

// Convert EST date to UTC range for database queries
function getESTDateRange(date: string) {
  // Convert EST date to UTC range
  const estStart = new Date(`${date}T00:00:00-05:00`); // EST start
  const estEnd = new Date(`${date}T23:59:59-05:00`);   // EST end
  
  return {
    start: estStart.toISOString(),
    end: estEnd.toISOString()
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentInterests = searchParams.get('interests');
    const presentationStyle = searchParams.get('style');
    const userId: string | null = searchParams.get('userId') || null;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // For unauthenticated users, just return general articles from today
    if (!userId) {
      console.log('[Enhanced Articles API] Unauthenticated user - fetching general articles from today');
      
      const supabase = await createClientForServer();
      const today = getCurrentESTDate();
      
      const { start: todayStart, end: todayEnd } = getESTDateRange(today);
      
      const { data: generalArticles, error: generalError } = await supabase
        .from('enhanced_articles')
        .select('*, gen_article_id::text')
        .is('user_id', null)
        .gte('generated_at', todayStart)
        .lte('generated_at', todayEnd)
        .gte('expires_at', new Date().toISOString()) // Not expired
        .order('generated_at', { ascending: false })
        .limit(6);

      if (generalError) {
        console.error('Error fetching general enhanced articles:', generalError);
        return NextResponse.json(
          { error: 'Failed to fetch enhanced articles' },
          { status: 500 }
        );
      }

      const articles = generalArticles || [];
      console.log(`[Enhanced Articles API] Found ${articles.length} general articles from today`);

      return NextResponse.json({
        articles: articles.slice(0, 6),
        source: 'pre-computed',
        refreshesRemaining: null
      });
    }

    // For authenticated users, continue with preference-based logic
    if (!contentInterests || !presentationStyle) {
      return NextResponse.json(
        { error: 'Content interests and presentation style are required' },
        { status: 400 }
      );
    }

    // TypeScript type guards - we know these are not null after the check above
    const safeContentInterests = contentInterests as string;
    const safePresentationStyle = presentationStyle as string;

    const contentHash = hashContentPreferences(safeContentInterests);
    const styleHash = hashStylePreferences(safePresentationStyle);
    const today = getCurrentESTDate();

    const supabase = await createClientForServer();

    // Check refresh limit if user is authenticated and forcing refresh
    if (userId && forceRefresh) {
      const { canRefresh } = await checkUserRefreshLimit(userId);
      if (!canRefresh) {
        return NextResponse.json(
          { 
            error: 'Daily refresh limit reached', 
            refreshesRemaining: 0,
            limit: 3
          },
          { status: 429 }
        );
      }
    }

    // Query user-specific articles
    let articles: unknown[] = [];

    console.log(`[Enhanced Articles API] Searching for user-specific articles with:`);
    console.log(`  - userId: ${userId}`);
    console.log(`  - contentInterests: "${safeContentInterests}"`);
    console.log(`  - presentationStyle: "${safePresentationStyle}"`);
    console.log(`  - contentHash: "${contentHash}"`);
    console.log(`  - styleHash: "${styleHash}"`);
    console.log(`  - today: "${today}"`);

    // Try user-specific articles first
    console.log(`[Enhanced Articles API] Searching for user-specific articles...`);
    const { start: todayStart, end: todayEnd } = getESTDateRange(today);
    
    const { data: userArticles, error: userError } = await supabase
      .from('enhanced_articles')
      .select('*, gen_article_id::text')
      .eq('user_id', userId)
      .eq('content_preferences_hash', contentHash)
      .eq('style_preferences_hash', styleHash)
      .gte('generated_at', todayStart)
      .lte('generated_at', todayEnd)
      .gte('expires_at', new Date().toISOString()) // Not expired
      .order('generated_at', { ascending: false })
      .limit(6);

    if (userError) {
      console.error('Error fetching user-specific enhanced articles:', userError);
    } else {
      articles = userArticles || [];
      console.log(`[Enhanced Articles API] Found ${articles.length} user-specific articles`);
      
      // Debug: Let's see what articles exist for this user without date/expiry filters
      const { data: allUserArticles, error: debugError } = await supabase
        .from('enhanced_articles')
        .select('*, gen_article_id::text')
        .eq('user_id', userId)
        .eq('content_preferences_hash', contentHash)
        .eq('style_preferences_hash', styleHash)
        .order('generated_at', { ascending: false })
        .limit(10);
      
      if (!debugError && allUserArticles) {
        console.log(`[DEBUG] Found ${allUserArticles.length} total articles for this user/preferences combination`);
        allUserArticles.forEach((article, index) => {
          console.log(`[DEBUG] Article ${index + 1}: gen_article_id=${article.gen_article_id}, generated_at=${article.generated_at}, expires_at=${article.expires_at}`);
        });
      }
    }

    // If we have enough articles, return them
    if (articles.length >= 6) {
      return NextResponse.json({
        articles: articles.slice(0, 6),
        source: 'pre-computed',
        refreshesRemaining: null
      });
    }

    // 2. Fallback: Enhance on-demand
    console.log(`[Enhanced Articles API] Only found ${articles.length} pre-computed articles, enhancing ${6 - articles.length} on-demand`);

    // Get source articles via vector search
    const sourceArticles = await performVectorSearch(safeContentInterests, 6);
    
    if (sourceArticles.length === 0) {
      return NextResponse.json(
        { error: 'No articles found for your interests' },
        { status: 404 }
      );
    }

    // Filter out articles we already have enhanced versions of
    const existingArticleIds = new Set((articles as { gen_article_id: string }[]).map(a => a.gen_article_id));
    const articlesToEnhance = sourceArticles
      .filter(article => !existingArticleIds.has(String(article.article_id)))
      .slice(0, 6 - articles.length);

    // Enhance articles sequentially to avoid rate limits
    const enhancedArticles = [];
    
    for (const article of articlesToEnhance) {
      try {
        console.log(`[DEBUG] Processing article_id: ${article.article_id} (type: ${typeof article.article_id})`);
        // Keep as string to avoid precision loss
        const articleIdString = String(article.article_id);
        console.log(`[DEBUG] Using article_id: ${articleIdString} (type: ${typeof articleIdString})`);
        
        const enhancedContent = await enhanceArticle(article, safeContentInterests, safePresentationStyle);
        
        // Save to database for future use
        await saveEnhancedArticle({
          user_id: userId as string | null,
          gen_article_id: articleIdString || null,
          title: article.title,
          content: enhancedContent || "",
          citations: null, // Don't store citations - fetch from original article when needed
          content_preferences_hash: contentHash || 'general',
          style_preferences_hash: styleHash || 'general',
          content_preferences: safeContentInterests,
          style_preferences: safePresentationStyle,
          enhancement_metadata: {
            enhanced_at: new Date().toISOString(),
            enhanced_by: 'on-demand',
            original_article_date: article.date,
            user_preferences: { contentInterests: safeContentInterests, presentationStyle: safePresentationStyle }
          }
        });

        const enhancedArticle = {
          id: crypto.randomUUID(),
          user_id: userId || null,
          gen_article_id: articleIdString,
          title: article.title,
          content: enhancedContent || "",
          citations: null, // Don't include citations - fetch from original article when needed
          content_preferences_hash: contentHash || 'general',
          style_preferences_hash: styleHash || 'general',
          content_preferences: safeContentInterests,
          style_preferences: safePresentationStyle,
          similarity_score: null,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          enhancement_metadata: {
            enhanced_at: new Date().toISOString(),
            enhanced_by: 'on-demand',
            original_article_date: article.date,
            user_preferences: { contentInterests: safeContentInterests, presentationStyle: safePresentationStyle }
          }
        };
        
        enhancedArticles.push(enhancedArticle);
        
        // Add delay between API calls to avoid rate limits (2 seconds)
        if (articlesToEnhance.indexOf(article) < articlesToEnhance.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`Error enhancing article ${article.article_id}:`, error);
        
        // Return original article as fallback
        const fallbackArticle = {
          id: crypto.randomUUID(),
          user_id: userId || null,
          gen_article_id: String(article.article_id), // Keep as string
          title: article.title,
          content: article.content, // Use original content as fallback
          citations: null, // Don't include citations - fetch from original article when needed
          content_preferences_hash: contentHash || 'general',
          style_preferences_hash: styleHash || 'general',
          content_preferences: safeContentInterests,
          style_preferences: safePresentationStyle,
          similarity_score: null,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          enhancement_metadata: {
            enhanced_at: new Date().toISOString(),
            enhanced_by: 'fallback',
            original_article_date: article.date,
            user_preferences: { contentInterests: safeContentInterests, presentationStyle: safePresentationStyle },
            error: 'Enhancement failed, using original content'
          }
        };
        
        enhancedArticles.push(fallbackArticle);
        
        // Add delay even for failed articles
        if (articlesToEnhance.indexOf(article) < articlesToEnhance.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Record refresh if user is authenticated and forcing refresh
    if (userId && forceRefresh) {
      try {
        await recordUserRefresh(userId);
      } catch (error) {
        console.error('Error recording user refresh:', error);
        // Don't fail the request if recording fails
      }
    }

    const allArticles = [...articles, ...enhancedArticles].slice(0, 6);

    return NextResponse.json({
      articles: allArticles,
      source: 'hybrid',
      partiallyPreComputed: articles.length > 0,
      refreshesRemaining: null
    });

  } catch (error) {
    console.error('[Enhanced Articles API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get enhanced articles' },
      { status: 500 }
    );
  }
} 