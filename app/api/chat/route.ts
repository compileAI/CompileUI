import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, SourceArticleContext } from "@/types";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { auth0 } from "@/lib/auth0";
import { saveChatMessageAsync } from "@/utils/chatMessages";

// Input sanitization utilities
const sanitizeInput = {
  // Remove potential prompt injection patterns
  cleanPromptInjection: (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    
    return text
      // Remove system-level commands and role instructions
      .replace(/(?:^|\n)\s*(?:system|assistant|user)\s*[:：]\s*/gi, '')
      .replace(/(?:^|\n)\s*(?:ignore|forget|disregard)\s+(?:previous|above|all|instructions?|context|rules?)/gi, '[FILTERED]')
      .replace(/(?:^|\n)\s*(?:now|instead|from now on)\s+(?:act|behave|respond|pretend)\s+(?:as|like)/gi, '[FILTERED]')
      
      // Remove attempts to break context boundaries
      .replace(/(?:^|\n)\s*(?:─+|=+|\*+|-{3,}|#{3,})\s*(?:end|stop|break|new|start)\s*(?:context|instructions?|prompt|system)/gi, '[FILTERED]')
      .replace(/(?:^|\n)\s*(?:\[|\()?(?:end|stop|break)\s*(?:of\s+)?(?:context|instructions?|prompt|system)(?:\]|\))?/gi, '[FILTERED]')
      
      // Remove attempts to inject new instructions
      .replace(/(?:^|\n)\s*(?:new\s+)?(?:instructions?|rules?|guidelines?|context)\s*[:：]\s*/gi, '[FILTERED]: ')
      .replace(/(?:^|\n)\s*(?:override|replace|update)\s+(?:instructions?|rules?|context|system)/gi, '[FILTERED]')
      
      // Remove attempts to escape or manipulate formatting
      .replace(/\\[nrt"'`]/g, ' ')
      .replace(/(?:```|''')[\s\S]*?(?:```|''')/g, '[CODE_BLOCK_REMOVED]')
      .replace(/(?:^|\n)\s*<\/?(?:system|assistant|user|instruction|prompt)(?:\s[^>]*)?>.*?(?:<\/(?:system|assistant|user|instruction|prompt)>|$)/gi, '[FILTERED]')
      
      // Limit excessive repetition (potential attack vector)
      .replace(/(.{1,10})\1{10,}/g, '$1[REPEATED_CONTENT]')
      
      // Remove potential unicode/encoding attacks
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
      
      // Trim and normalize whitespace
      .trim()
      .replace(/\s+/g, ' ');
  },

  // Validate and sanitize article context
  validateArticleContext: (context: unknown): { article_id: string; title?: string; content?: string } | null => {
    if (!context || typeof context !== 'object') return null;
    
    const ctx = context as Record<string, unknown>;
    
    // Validate article_id (required)
    if (!ctx.article_id || typeof ctx.article_id !== 'string') return null;
    const articleId = ctx.article_id.trim();
    if (!articleId || articleId.length > 100) return null;
    
    // Validate and sanitize optional fields
    const result: { article_id: string; title?: string; content?: string } = { article_id: articleId };
    
    if (ctx.title && typeof ctx.title === 'string') {
      const title = sanitizeInput.cleanPromptInjection(ctx.title);
      if (title.length > 0 && title.length <= 500) {
        result.title = title;
      }
    }
    
    if (ctx.content && typeof ctx.content === 'string') {
      const content = sanitizeInput.cleanPromptInjection(ctx.content);
      if (content.length > 0 && content.length <= 50000) { // Reasonable limit for article content
        result.content = content;
      }
    }
    
    return result;
  },

  // Validate chat history
  validateChatHistory: (history: unknown): ChatMessage[] => {
    if (!Array.isArray(history)) return [];
    
    return history
      .filter((msg: unknown): msg is Record<string, unknown> => {
        return msg !== null && 
               msg !== undefined &&
               typeof msg === 'object' && 
               typeof (msg as Record<string, unknown>).content === 'string' &&
               typeof (msg as Record<string, unknown>).role === 'string';
      })
      .slice(-20) // Limit history to last 20 messages
      .map((msg: Record<string, unknown>) => ({
        id: typeof msg.id === 'string' ? msg.id : Date.now().toString(),
        role: (msg.role === 'assistant' || msg.role === 'user') ? msg.role as 'assistant' | 'user' : 'user' as const,
        content: sanitizeInput.cleanPromptInjection(msg.content as string).slice(0, 2000), // Limit message length
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date()
      }))
      .filter(msg => msg.content.length > 0);
  },

  // Rate limiting check (basic implementation)
  checkRateLimit: (identifier: string): boolean => {
    // In production, implement proper rate limiting with Redis or similar
    // This is a basic in-memory implementation for demonstration
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 30; // 30 requests per minute
    
    const globalObj = global as unknown as { rateLimitStore?: Map<string, number[]> };
    
    if (!globalObj.rateLimitStore) {
      globalObj.rateLimitStore = new Map();
    }
    
    const userRequests = globalObj.rateLimitStore.get(identifier) || [];
    const recentRequests = userRequests.filter((time: number) => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    globalObj.rateLimitStore.set(identifier, recentRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [key, requests] of globalObj.rateLimitStore.entries()) {
        const filtered = requests.filter((time: number) => now - time < windowMs);
        if (filtered.length === 0) {
          globalObj.rateLimitStore.delete(key);
        } else {
          globalObj.rateLimitStore.set(key, filtered);
        }
      }
    }
    
    return true;
  }
};

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// We post to this route from ChatPageClient.tsx, this is the API endpoint for the chat.
// Currently it joins the gen_article and source_articles tables to get the source articles for the article.
// - deduplicates the source articles and returns them in a string.
// - sends the message to the Gemini model.
// - returns the response from the Gemini model.
export async function POST(req: Request) {
    try {
        // Parse and validate request body size
        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 100000) { // 100KB limit
            return NextResponse.json(
                { error: 'Request too large' },
                { status: 413 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON' },
                { status: 400 }
            );
        }

        // Extract and validate input fields
        const { message, history, articleContext, faqContext } = body;

        // Validate and sanitize message
        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required and must be a string' },
                { status: 400 }
            );
        }

        const sanitizedMessage = sanitizeInput.cleanPromptInjection(message);
        if (!sanitizedMessage || sanitizedMessage.length === 0) {
            return NextResponse.json(
                { error: 'Message cannot be empty after sanitization' },
                { status: 400 }
            );
        }

        if (sanitizedMessage.length > 2000) {
            return NextResponse.json(
                { error: 'Message too long (max 2000 characters)' },
                { status: 400 }
            );
        }

        // Validate and sanitize article context
        const validatedArticleContext = sanitizeInput.validateArticleContext(articleContext);
        if (!validatedArticleContext) {
            return NextResponse.json(
                { error: 'Valid article context with article_id is required' },
                { status: 400 }
            );
        }

        // Validate and sanitize chat history
        const validatedHistory = sanitizeInput.validateChatHistory(history);

        // Validate and sanitize FAQ context
        let sanitizedFaqContext: string | undefined;
        if (faqContext) {
            if (typeof faqContext !== 'string') {
                return NextResponse.json(
                    { error: 'FAQ context must be a string' },
                    { status: 400 }
                );
            }
            sanitizedFaqContext = sanitizeInput.cleanPromptInjection(faqContext);
            if (sanitizedFaqContext.length > 5000) { // Limit FAQ context size
                sanitizedFaqContext = sanitizedFaqContext.slice(0, 5000);
            }
        }

        // Basic rate limiting
        const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        if (!sanitizeInput.checkRateLimit(clientIP)) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        // Initialize Supabase client with Auth0 token
        const supabase = await createSupabaseServerClient();

        // Get current Auth0 user for message persistence (don't block chat if no user)
        let currentUser = null;
        try {
            const session = await auth0.getSession();
            currentUser = session?.user || null;
        } catch (authError) {
            console.warn('[API /api/chat] Failed to get user for message persistence:', authError);
        }

        // Generate unique message ID for user message
        const userMessageId = `msg_${Date.now()}_user`;

        // Save user message asynchronously (if authenticated)
        if (currentUser) {
            saveChatMessageAsync({
                user_id: currentUser.sub,
                article_id: validatedArticleContext.article_id,
                message_id: userMessageId,
                role: 'user',
                content: sanitizedMessage // Use sanitized message
            }).catch(error => {
                console.error('[API /api/chat] Failed to save user message:', error);
            });
        }

        let sourceArticlesContextString = "";
        console.log(`[API /api/chat] Attempting to fetch source articles for gen_article_id: ${validatedArticleContext.article_id}`);
        try {
            // This implicitly joins the citations_ref and source_articles tables since Supabase knows the foreign key relationship.
            // We can then filter this to be only articles corresponding to the gen_article_id.
            const { data: sourceArticlesData, error: sourceArticlesError } = await supabase
                .from('citations_ref')
                .select(`
                    source_articles (
                        id,
                        title,
                        content,
                        author,
                        url
                    )
                `)
                .eq('gen_article_id', validatedArticleContext.article_id);

            if (sourceArticlesError) {
                console.error('[API /api/chat] Supabase error fetching source articles:', sourceArticlesError);
            } else {
                // Log raw data if needed for debugging, but can be verbose
                // console.log('[API /api/chat] Supabase response for source articles raw data:', JSON.stringify(sourceArticlesData, null, 2));
            }

            if (sourceArticlesData && sourceArticlesData.length > 0) {
                
                const allFetchedSourceArticles = sourceArticlesData
                    .map(item => item.source_articles)
                    .flat() // Flatten calms down the type system from complaining about a possible nested array.
                    .filter((sa): sa is SourceArticleContext => sa !== null && sa !== undefined);

                // DEBUG
                console.log(`[API /api/chat] Initially fetched ${allFetchedSourceArticles.length} source article references (could be duplicates).`);

                // Now we deduplicate the source articles to avoid passing a bunch of times.
                const uniqueSourceArticlesMap = new Map<string, SourceArticleContext>();
                allFetchedSourceArticles.forEach(sa => {
                    if (sa && sa.id && !uniqueSourceArticlesMap.has(sa.id)) { // Check if sa and sa.id are defined
                        uniqueSourceArticlesMap.set(sa.id, sa);
                    }
                });
                const fetchedSourceArticles: SourceArticleContext[] = Array.from(uniqueSourceArticlesMap.values());

                // DEBUG
                console.log(`[API /api/chat] Found ${fetchedSourceArticles.length} unique valid source articles after mapping and deduplication.`);

                if (fetchedSourceArticles.length > 0) {
                    fetchedSourceArticles.forEach((sa, index) => {
                        console.log(`[API /api/chat] Unique Source Article ${index + 1} Details: ID: ${sa.id}, Title: ${sa.title ? sa.title.substring(0,50)+'...' : 'N/A'}`);
                    });

                    sourceArticlesContextString = "\n\nAdditionally, here are some excerpts from source articles that were used to generate the main article. You can refer to these for more specific details or direct quotes:\n\n";
                    fetchedSourceArticles.forEach((sa, index) => {
                        sourceArticlesContextString += `--- Source Article ${index + 1} (ID: ${sa.id}) ---\n`;
                        if (sa.title) sourceArticlesContextString += `Title: ${sa.title}\n`;
                        if (sa.author) sourceArticlesContextString += `Author: ${sa.author}\n`;
                        if (sa.url) sourceArticlesContextString += `URL: ${sa.url}\n`;
                        if (sa.content) {
                            // Ensure content is not null before calling substring
                            const contentSnippet = sa.content ? sa.content.substring(0, 500) : "Content not available";
                            sourceArticlesContextString += `Content Snippet: ${contentSnippet}...\n`;
                        }
                        sourceArticlesContextString += `--------------\n\n`;
                    });
                    // console.log("[API /api/chat] Constructed sourceArticlesContextString (first 300 chars):", sourceArticlesContextString.substring(0,300) + "...");
                } else {
                    sourceArticlesContextString = "\n\nNo specific source articles were found or linked for additional context after processing.\n";
                    console.log("[API /api/chat] No valid source articles after processing the data and deduplication.");
                }
            } else {
                sourceArticlesContextString = "\n\nNo citation references found for this generated article (query returned no data or empty array).\n";
                console.log("[API /api/chat] No citation_ref entries found or source_articles were null for gen_article_id:", validatedArticleContext.article_id);
            }
        } catch (dbError) {
            console.error('[API /api/chat] Database operation error for source articles:', dbError);
            sourceArticlesContextString = "\n\nThere was an issue retrieving source article information.\n";
        }

        // Use Gemini 2.5 Flash with Google Search grounding using new @google/genai library
        const model = "gemini-2.5-flash-preview-05-20";

        // Create system message with validated and sanitized context
        let systemMessage = "";
        if (validatedArticleContext.title && validatedArticleContext.content) {
            let faqContextString = "";
            if (sanitizedFaqContext) {
                faqContextString = `
                
                IMPORTANT FAQ CONTEXT:
                The user is asking about a topic that has this pre-existing answer available: "${sanitizedFaqContext}"
                
                Use this information to provide a more informed and detailed response. You can expand on this answer, provide additional context, or clarify any points, but this gives you a good starting point for the user's question.
                `;
            }
            
            systemMessage = `You are an AI assistant that answers user questions about a specific news article.

──────────────────  CORE CONTEXT  ──────────────────
Main Article
  • Title: ${validatedArticleContext.title}
  • Content: ${validatedArticleContext.content}

${sourceArticlesContextString}
${faqContextString}          ← (optional blocks injected upstream)
─────────────────────────────────────────────────────

✨  OPERATING RULES
1. **Source hierarchy**  
   a. Primary: the Main Article.  
   b. Secondary: the article’s cited sources.  
   c. Tertiary: live web search **only if** tiers (a) and (b) do not contain the needed facts.

2. **Step-by-step workflow (follow silently)**  
   ① Parse the user’s question.  
   ② Scan the Main Article + cited sources.  
   ③ **If the answer is still missing, run ONE focused web search query.**  
       • Craft the query from key nouns in the user’s request.  
       • Ignore stale or low-authority domains; prefer results ≤ 2 years old unless historical context is required.  
   ④ Draft a concise answer (≤ 2 short paragraphs unless the user asks for depth).  
   ⑤ Mention where each fact came from (“According to *<Source Title>* …”). **Never use brackets like [1], [Main_Article], or similar.**. 
      Only do this for web search, not for any of the provided context.
      

3. **When web search still fails**  
   • Respond with a short apology + offer a next step (“I couldn’t locate that detail; would you like me to broaden the search?”).  
   • **Do NOT describe the search process or complain about missing links.**

4. **Style guardrails**  
   • Write in clear professional prose—no filler phrases (“I found this link but…”).  
   • Avoid speculation, hedging, or repetition.  
   • If sources conflict, summarise both sides without forcing a verdict.

5. **Scope management**  
   • Do not respond to fully off-topic queries. Politely steer off-topic queries back to themes covered by the article.
        For example:
            User: "What's the capital of Brazil?"
            Assistant: “That's outside the scope of this article. However, were you curious about Brazil's role in the global AI market, as mentioned in the article?”  
   • Support reasonable tangents that build on the article (e.g., “How does this funding compare to last year’s AI investments?”).

🔒  ABSOLUTE PROHIBITIONS
- No inline numeric citations or placeholders.  
- No meta commentary about “searching the web” or model limitations.  
- No quoting the entire article; quote snippets only as needed for clarity.

Remember: **Answer grounded in the article first, supplement with verified external facts second, and stay concise.**
`;
        } else {
            systemMessage = "You are a helpful AI assistant with access to current web information through Google Search.";
        }

        // Convert chat history to new format with proper structure
        const contents = [];
        
        // Add system message as first user message
        contents.push({
            role: 'user',
            parts: [{ text: systemMessage }]
        });

        // Add validated chat history
        if (validatedHistory && validatedHistory.length > 0) {
            validatedHistory.forEach((msg: ChatMessage) => {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            });
        }

        // Add current sanitized user message
        contents.push({
            role: 'user',
            parts: [{ text: sanitizedMessage }]
        });

        const response = await genAI.models.generateContent({
            model: model,
            contents: contents,
            config: {
                tools: [{ googleSearch: {} }], // Enable Google Search grounding
                responseModalities: ["TEXT"]
            }
        });

        const text = response.text || 'No response generated';

        console.log(`[API /api/chat] Generated response with Google Search grounding enabled`);

        // Generate unique message ID for assistant response
        const assistantMessageId = `msg_${Date.now()}_assistant`;

        // Save assistant response asynchronously (if authenticated)
        if (currentUser) {
            saveChatMessageAsync({
                user_id: currentUser.sub,
                article_id: validatedArticleContext.article_id,
                message_id: assistantMessageId,
                role: 'assistant',
                content: text
            }).catch(error => {
                console.error('[API /api/chat] Failed to save assistant message:', error);
            });
        }

        return NextResponse.json({ 
            message: text 
        }, { status: 200 });

    } catch (error) {
        console.error('Gemini API error or other internal error:', error);
        // Check if it's a GoogleGenerativeAIError for more specific details
        if (error instanceof Error && 'message' in error) {
             console.error("Error message:", error.message);
        }
        return NextResponse.json(
            { error: 'Failed to get response from API' },
            { status: 500 }
        );
    }
}