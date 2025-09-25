import { NextRequest } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, SourceArticleContext } from "@/types";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { auth0 } from "@/lib/auth0";
import { saveChatMessageAsync } from "@/utils/chatMessages";
import { logger } from "@/lib/logger";

// Input sanitization utilities (reusing from the original route)
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
  }
};

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// WebSocket handler for streaming chat
export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  return new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    },
  });
}

// WebSocket message handler
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, history, articleContext, faqContext } = body;

    // Validate and sanitize message
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedMessage = sanitizeInput.cleanPromptInjection(message);
    if (!sanitizedMessage || sanitizedMessage.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty after sanitization' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sanitizedMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 2000 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize article context
    const validatedArticleContext = sanitizeInput.validateArticleContext(articleContext);
    if (!validatedArticleContext) {
      return new Response(
        JSON.stringify({ error: 'Valid article context with article_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize chat history
    const validatedHistory = sanitizeInput.validateChatHistory(history);

    // Validate and sanitize FAQ context
    let sanitizedFaqContext: string | undefined;
    if (faqContext) {
      if (typeof faqContext !== 'string') {
        return new Response(
          JSON.stringify({ error: 'FAQ context must be a string' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      sanitizedFaqContext = sanitizeInput.cleanPromptInjection(faqContext);
      if (sanitizedFaqContext.length > 5000) { // Limit FAQ context size
        sanitizedFaqContext = sanitizedFaqContext.slice(0, 5000);
      }
    }

    // Initialize Supabase client
            const supabase = await createSupabaseServerClient();

        // Get current Auth0 user for message persistence (don't block chat if no user)
        let currentUser = null;
        try {
            const session = await auth0.getSession();
            currentUser = session?.user || null;
        } catch (authError) {
            logger.warn('API /api/chat/ws', 'Failed to get user for message persistence', { error: String(authError) });
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
        logger.error('API /api/chat/ws', 'Failed to save user message', { error: String(error) });
      });
    }

    // Fetch source articles (same logic as original)
    let sourceArticlesContextString = "";
    logger.info('API /api/chat/ws', `Attempting to fetch source articles for gen_article_id: ${validatedArticleContext.article_id}`);
    try {
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
        logger.error('API /api/chat/ws', 'Supabase error fetching source articles', { error: sourceArticlesError });
      }

      if (sourceArticlesData && sourceArticlesData.length > 0) {
        const allFetchedSourceArticles = sourceArticlesData
          .map(item => item.source_articles)
          .flat()
          .filter((sa): sa is SourceArticleContext => sa !== null && sa !== undefined);

        console.log(`[API /api/chat/ws] Initially fetched ${allFetchedSourceArticles.length} source article references (could be duplicates).`);

        const uniqueSourceArticlesMap = new Map<string, SourceArticleContext>();
        allFetchedSourceArticles.forEach(sa => {
          if (sa && sa.id && !uniqueSourceArticlesMap.has(sa.id)) {
            uniqueSourceArticlesMap.set(sa.id, sa);
          }
        });
        const fetchedSourceArticles: SourceArticleContext[] = Array.from(uniqueSourceArticlesMap.values());

        console.log(`[API /api/chat/ws] Found ${fetchedSourceArticles.length} unique valid source articles after mapping and deduplication.`);

        if (fetchedSourceArticles.length > 0) {
          sourceArticlesContextString = "\n\nAdditionally, here are some excerpts from source articles that were used to generate the main article. You can refer to these for more specific details or direct quotes:\n\n";
          fetchedSourceArticles.forEach((sa, index) => {
            sourceArticlesContextString += `--- Source Article ${index + 1} (ID: ${sa.id}) ---\n`;
            if (sa.title) sourceArticlesContextString += `Title: ${sa.title}\n`;
            if (sa.author) sourceArticlesContextString += `Author: ${sa.author}\n`;
            if (sa.url) sourceArticlesContextString += `URL: ${sa.url}\n`;
            if (sa.content) {
              const contentSnippet = sa.content ? sa.content.substring(0, 500) : "Content not available";
              sourceArticlesContextString += `Content Snippet: ${contentSnippet}...\n`;
            }
            sourceArticlesContextString += `--------------\n\n`;
          });
        } else {
          sourceArticlesContextString = "\n\nNo specific source articles were found or linked for additional context after processing.\n";
          console.log("[API /api/chat/ws] No valid source articles after processing the data and deduplication.");
        }
      } else {
        sourceArticlesContextString = "\n\nNo citation references found for this generated article (query returned no data or empty array).\n";
        console.log("[API /api/chat/ws] No citation_ref entries found or source_articles were null for gen_article_id:", validatedArticleContext.article_id);
      }
    } catch (dbError) {
      console.error('[API /api/chat/ws] Database operation error for source articles:', dbError);
      sourceArticlesContextString = "\n\nThere was an issue retrieving source article information.\n";
    }

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
   b. Secondary: the article's cited sources.  
   c. Tertiary: live web search **only if** tiers (a) and (b) do not contain the needed facts.

2. **Step-by-step workflow (follow silently)**  
   ① Parse the user's question.  
   ② Scan the Main Article + cited sources.  
   ③ **If the answer is still missing, run ONE focused web search query.**  
       • Craft the query from key nouns in the user's request.  
       • Ignore stale or low-authority domains; prefer results ≤ 2 years old unless historical context is required.  
   ④ Draft a concise answer (≤ 2 short paragraphs unless the user asks for depth).  
   ⑤ Mention where each fact came from ("According to *<Source Title>* …"). **Never use brackets like [1], [Main_Article], or similar.**. 
      Only do this for web search, not for any of the provided context.
      

3. **When web search still fails**  
   • Respond with a short apology + offer a next step ("I couldn't locate that detail; would you like me to broaden the search?").  
   • **Do NOT describe the search process or complain about missing links.**

4. **Style guardrails**  
   • Write in clear professional prose—no filler phrases ("I found this link but…").  
   • Avoid speculation, hedging, or repetition.  
   • If sources conflict, summarise both sides without forcing a verdict.

5. **Scope management**  
   • Do not respond to fully off-topic queries. Politely steer off-topic queries back to themes covered by the article.
        For example:
            User: "What's the capital of Brazil?"
            Assistant: "That's outside the scope of this article. However, were you curious about Brazil's role in the global AI market, as mentioned in the article?"  
   • Support reasonable tangents that build on the article (e.g., "How does this funding compare to last year's AI investments?").

🔒  ABSOLUTE PROHIBITIONS
- No inline numeric citations or placeholders.  
- No meta commentary about "searching the web" or model limitations.  
- No quoting the entire article; quote snippets only as needed for clarity.

Remember: **Answer grounded in the article first, supplement with verified external facts second, and stay concise.**
`;
    } else {
      systemMessage = "You are a helpful AI assistant with access to current web information through Google Search.";
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
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

          // Send start message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`)
          );

          // Generate response from Gemini (fallback to regular generation for now)
          const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-05-20",
            contents: contents,
            config: {
              tools: [{ googleSearch: {} }], // Enable Google Search grounding
              responseModalities: ["TEXT"]
            }
          });

          const fullResponse = response.text || 'No response generated';
          
          // Simulate streaming by chunking the response
          const chunkSize = 3; // Words per chunk
          const words = fullResponse.split(' ');
          
          for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            if (chunk.trim()) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'chunk', 
                  content: i === 0 ? chunk : ' ' + chunk 
                })}\n\n`)
              );
              
              // Add small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          // Send completion message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'complete',
              fullContent: fullResponse
            })}\n\n`)
          );

          // Save assistant response asynchronously (if authenticated)
          if (currentUser && fullResponse) {
            const assistantMessageId = `msg_${Date.now()}_assistant`;
            saveChatMessageAsync({
              user_id: currentUser.sub,
              article_id: validatedArticleContext.article_id,
              message_id: assistantMessageId,
              role: 'assistant',
              content: fullResponse
            }).catch(error => {
              console.error('[API /api/chat/ws] Failed to save assistant message:', error);
            });
          }

          controller.close();
          console.log(`[API /api/chat/ws] Generated streaming response with Google Search grounding enabled`);

        } catch (error) {
          console.error('[API /api/chat/ws] Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'Failed to generate response' 
            })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[API /api/chat/ws] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}