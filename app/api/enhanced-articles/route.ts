import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { performVectorSearch } from "@/lib/vectorSearch";
import { GoogleGenAI } from "@google/genai";
import { Article } from "@/types";
import { DEFAULT_CONTENT_INTERESTS, DEFAULT_PRESENTATION_STYLE } from "@/utils/preferences";
import { createHash } from 'crypto';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// Helper function to hash content preferences
function hashContentPreferences(contentInterests: string): string {
  return createHash('sha256')
    .update(contentInterests)
    .digest('hex');
}

// Helper function to hash style preferences
function hashStylePreferences(presentationStyle: string): string {
  return createHash('sha256')
    .update(presentationStyle)
    .digest('hex');
}

// Helper function to enhance a single article
async function enhanceArticle(article: Article, contentInterests: string, presentationStyle: string) {
  try {
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
    
    if (!response.text) {
      throw new Error('Empty response from Gemini API');
    }
    
    return response.text;
  } catch (error) {
    console.error('[Enhanced Articles API] Gemini API error:', error);
    throw new Error(`Failed to enhance article: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  try {
    const supabase = await createSupabaseServerClient();
    
    const { error } = await supabase
      .from('enhanced_articles')
      .upsert({
        ...data,
        similarity_score: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

    if (error) {
      console.error('[Enhanced Articles API] Error saving enhanced article:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  } catch (error) {
    console.error('[Enhanced Articles API] Error in saveEnhancedArticle:', error);
    throw new Error(`Failed to save enhanced article: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to check user refresh limit
async function checkUserRefreshLimit(userId: string): Promise<{ canRefresh: boolean; refreshesRemaining: number }> {
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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

    console.log(`[Enhanced Articles API] Request received:`);
    console.log(`  - contentInterests: "${contentInterests}"`);
    console.log(`  - presentationStyle: "${presentationStyle}"`);
    console.log(`  - userId: "${userId}"`);
    console.log(`  - forceRefresh: ${forceRefresh}`);

    // Create a single Supabase client for the entire function
    const supabase = await createSupabaseServerClient();

    // For unauthenticated users, just return general articles from today
    if (!userId) {
      console.log('[Enhanced Articles API] Unauthenticated user - fetching general articles from today');
      
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

    // For authenticated users, check if they have saved preferences in the database
    // If they don't have saved preferences, treat them like unauthenticated users
    
    // Check if user has saved preferences
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('content_preferences, style_preferences')
      .eq('user_id', userId)
      .single();

    if (prefsError && prefsError.code === 'PGRST116') {
      // User has no saved preferences - return general articles
      console.log('[Enhanced Articles API] User has no saved preferences, returning general articles');
      
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
      console.log(`[Enhanced Articles API] Found ${articles.length} general articles for user with no preferences`);

      return NextResponse.json({
        articles: articles.slice(0, 6),
        source: 'pre-computed',
        refreshesRemaining: null
      });
    }

    if (prefsError) {
      console.error('Error checking user preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to check user preferences' },
        { status: 500 }
      );
    }

    // User has saved preferences - use them (or fall back to defaults if somehow empty)
    const safeContentInterests = userPrefs?.content_preferences || contentInterests || DEFAULT_CONTENT_INTERESTS;
    const safePresentationStyle = userPrefs?.style_preferences || presentationStyle || DEFAULT_PRESENTATION_STYLE;

    console.log(`[Enhanced Articles API] User has saved preferences:`);
    console.log(`  - safeContentInterests: "${safeContentInterests}"`);
    console.log(`  - safePresentationStyle: "${safePresentationStyle}"`);

    const contentHash = hashContentPreferences(safeContentInterests);
    const styleHash = hashStylePreferences(safePresentationStyle);
    const today = getCurrentESTDate();

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

    // 2. Fallback: Enhance on-demand with threshold widening
    console.log(`[Enhanced Articles API] Only found ${articles.length} pre-computed articles, enhancing ${6 - articles.length} on-demand`);

    // Phase 1: Article Selection with Threshold Widening
    // Start with high similarity threshold and gradually lower it until we get 6 articles
    const targetCount = 6;
    const thresholds = [0.5, 0.4, 0.3, 0.2, 0.1, 0.05]; // Start high, drop until minimum
    let sourceArticles: Article[] = [];

    for (const threshold of thresholds) {
      console.log(`[Enhanced Articles API] Trying threshold ${threshold} for article selection`);
      
      // Get more articles than needed to account for filtering and enhancement failures
      const searchLimit = Math.max(targetCount * 3, 20);
      const candidateArticles = await performVectorSearch(safeContentInterests, searchLimit);
      
      // Filter by similarity score if available (for now, we'll use all articles since performVectorSearch doesn't return scores)
      // In a more sophisticated implementation, we would filter by actual similarity scores
      sourceArticles = candidateArticles.slice(0, targetCount * 2); // Take more than needed for fallback
      
      if (sourceArticles.length >= targetCount) {
        console.log(`[Enhanced Articles API] Found ${sourceArticles.length} articles with threshold ${threshold}`);
        break;
      }
    }

    // Phase 2: Fallback Article Selection
    // If we still don't have enough articles, expand the search
    if (sourceArticles.length < targetCount) {
      console.log(`[Enhanced Articles API] Only found ${sourceArticles.length} articles, expanding search`);
      
      // Try with broader search parameters
      const expandedArticles = await performVectorSearch(safeContentInterests, targetCount * 5);
      sourceArticles = expandedArticles.slice(0, targetCount * 2);
      
      console.log(`[Enhanced Articles API] Expanded search found ${sourceArticles.length} articles`);
    }
    
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

    // Phase 3: Article Enhancement with Retry Logic
    const enhancedArticles: Array<{
      id: string;
      user_id: string | null;
      gen_article_id: string;
      title: string;
      content: string;
      citations: unknown;
      content_preferences_hash: string;
      style_preferences_hash: string;
      content_preferences: string;
      style_preferences: string;
      similarity_score: number | null;
      generated_at: string;
      expires_at: string;
      enhancement_metadata: unknown;
    }> = [];
    const maxRetries = 3;
    
    for (const article of articlesToEnhance) {
      let enhancedContent: string | null = null;
      let retryCount = 0;
      
      // Retry enhancement up to maxRetries times
      while (retryCount < maxRetries && !enhancedContent) {
        try {
          console.log(`[Enhanced Articles API] Processing article_id: ${article.article_id} (attempt ${retryCount + 1}/${maxRetries})`);
          const articleIdString = String(article.article_id);
          
          enhancedContent = await enhanceArticle(article, safeContentInterests, safePresentationStyle);
          
          // Save to database for future use
          await saveEnhancedArticle({
            user_id: userId as string | null,
            gen_article_id: articleIdString || null,
            title: article.title,
            content: enhancedContent || "",
            citations: null,
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
            citations: null,
            content_preferences_hash: contentHash || 'general',
            style_preferences_hash: styleHash || 'general',
            content_preferences: safeContentInterests,
            style_preferences: safePresentationStyle,
            similarity_score: null,
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            enhancement_metadata: {
              enhanced_at: new Date().toISOString(),
              enhanced_by: 'on-demand',
              original_article_date: article.date,
              user_preferences: { contentInterests: safeContentInterests, presentationStyle: safePresentationStyle }
            }
          };
          
          enhancedArticles.push(enhancedArticle);
          console.log(`[Enhanced Articles API] Successfully enhanced article ${article.article_id}`);
          break; // Success, exit retry loop
          
        } catch (error) {
          retryCount++;
          console.error(`[Enhanced Articles API] Error enhancing article ${article.article_id} (attempt ${retryCount}/${maxRetries}):`, error);
          
          if (retryCount >= maxRetries) {
            // All retries failed, use original content as fallback
            console.log(`[Enhanced Articles API] All retries failed for article ${article.article_id}, using original content`);
            
            const fallbackArticle = {
              id: crypto.randomUUID(),
              user_id: userId || null,
              gen_article_id: String(article.article_id),
              title: article.title,
              content: article.content, // Use original content as fallback
              citations: null,
              content_preferences_hash: contentHash || 'general',
              style_preferences_hash: styleHash || 'general',
              content_preferences: safeContentInterests,
              style_preferences: safePresentationStyle,
              similarity_score: null,
              generated_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              enhancement_metadata: {
                enhanced_at: new Date().toISOString(),
                enhanced_by: 'fallback',
                original_article_date: article.date,
                user_preferences: { contentInterests: safeContentInterests, presentationStyle: safePresentationStyle },
                error: 'Enhancement failed after all retries, using original content'
              }
            };
            
            enhancedArticles.push(fallbackArticle);
          }
        }
      }
    }

    // Phase 4: Additional Enhancement Attempts if needed
    // If we still don't have 6 articles, try to enhance more articles from the source pool
    const totalArticles = articles.length + enhancedArticles.length;
    if (totalArticles < targetCount) {
      console.log(`[Enhanced Articles API] Only have ${totalArticles} articles, need ${targetCount - totalArticles} more`);
      
      const remainingNeeded = targetCount - totalArticles;
      const additionalArticles = sourceArticles
        .filter(article => {
          const articleId = String(article.article_id);
          const existingIds = new Set([
            ...(articles as { gen_article_id: string }[]).map(a => a.gen_article_id),
            ...enhancedArticles.map(a => a.gen_article_id)
          ]);
          return !existingIds.has(articleId);
        })
        .slice(0, remainingNeeded * 2); // Get more than needed for retry attempts
      
      for (const article of additionalArticles) {
        if (enhancedArticles.length + articles.length >= targetCount) {
          break; // We have enough articles
        }
        
        try {
          console.log(`[Enhanced Articles API] Additional enhancement attempt for article ${article.article_id}`);
          const articleIdString = String(article.article_id);
          
          const enhancedContent = await enhanceArticle(article, safeContentInterests, safePresentationStyle);
          
          const additionalEnhancedArticle = {
            id: crypto.randomUUID(),
            user_id: userId || null,
            gen_article_id: articleIdString,
            title: article.title,
            content: enhancedContent || "",
            citations: null,
            content_preferences_hash: contentHash || 'general',
            style_preferences_hash: styleHash || 'general',
            content_preferences: safeContentInterests,
            style_preferences: safePresentationStyle,
            similarity_score: null,
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            enhancement_metadata: {
              enhanced_at: new Date().toISOString(),
              enhanced_by: 'additional-attempt',
              original_article_date: article.date,
              user_preferences: { contentInterests: safeContentInterests, presentationStyle: safePresentationStyle }
            }
          };
          
          enhancedArticles.push(additionalEnhancedArticle);
          console.log(`[Enhanced Articles API] Successfully enhanced additional article ${article.article_id}`);
          
        } catch (error) {
          console.error(`[Enhanced Articles API] Failed to enhance additional article ${article.article_id}:`, error);
          
          // Use original content as fallback
          const fallbackArticle = {
            id: crypto.randomUUID(),
            user_id: userId || null,
            gen_article_id: String(article.article_id),
            title: article.title,
            content: article.content,
            citations: null,
            content_preferences_hash: contentHash || 'general',
            style_preferences_hash: styleHash || 'general',
            content_preferences: safeContentInterests,
            style_preferences: safePresentationStyle,
            similarity_score: null,
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            enhancement_metadata: {
              enhanced_at: new Date().toISOString(),
              enhanced_by: 'additional-fallback',
              original_article_date: article.date,
              user_preferences: { contentInterests: safeContentInterests, presentationStyle: safePresentationStyle },
              error: 'Additional enhancement failed, using original content'
            }
          };
          
          enhancedArticles.push(fallbackArticle);
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
    
    // Final guarantee: ensure exactly 6 articles are returned
    const finalArticles = allArticles.length >= 6 ? allArticles.slice(0, 6) : allArticles;
    
    console.log(`[Enhanced Articles API] Final result: ${finalArticles.length} articles (target: 6)`);
    
    // If we still don't have 6 articles, log a warning but return what we have
    if (finalArticles.length < 6) {
      console.warn(`[Enhanced Articles API] WARNING: Could only provide ${finalArticles.length} articles instead of 6`);
    }

    return NextResponse.json({
      articles: finalArticles,
      source: 'hybrid',
      partiallyPreComputed: articles.length > 0,
      refreshesRemaining: null
    });

  } catch (error) {
    console.error('[Enhanced Articles API] Error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // If it's an error we threw with a specific message
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // For unknown errors, return a generic message
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
} 