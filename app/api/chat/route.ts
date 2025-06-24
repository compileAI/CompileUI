import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, SourceArticleContext } from "@/types";
import { createClientForServer } from "@/utils/supabase/server";

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// We post to this route from ChatPageClient.tsx, this is the API endpoint for the chat.
// Currently it joins the gen_article and source_articles tables to get the source articles for the article.
// - deduplicates the source articles and returns them in a string.
// - sends the message to the Gemini model.
// - returns the response from the Gemini model.
export async function POST(req: Request) {
    try {
        // Expect message (question), history (chat history), and articleContext (article id, title, and content) from the client.
        const { message, history, articleContext }: {
            message: string;
            history: ChatMessage[];
            articleContext: {
                article_id: string; // Ensure this is a string
                title?: string;
                content?: string;
            };
        } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }
        if (!articleContext || !articleContext.article_id) { // Check for article_id
            return NextResponse.json(
                { error: 'Article context with article_id is required' },
                { status: 400 }
            );
        }

        // Initialize Supabase client
        const supabase = await createClientForServer();

        let sourceArticlesContextString = "";
        console.log(`[API /api/chat] Attempting to fetch source articles for gen_article_id: ${articleContext.article_id}`);
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
                .eq('gen_article_id', articleContext.article_id);

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
                console.log("[API /api/chat] No citation_ref entries found or source_articles were null for gen_article_id:", articleContext.article_id);
            }
        } catch (dbError) {
            console.error('[API /api/chat] Database operation error for source articles:', dbError);
            sourceArticlesContextString = "\n\nThere was an issue retrieving source article information.\n";
        }

        // Use Gemini 2.5 Flash with Google Search grounding using new @google/genai library
        const model = "gemini-2.5-flash-preview-05-20";

        // Create system message with article context
        let systemMessage = "";
        if (articleContext.title && articleContext.content) {
            systemMessage = `You are an AI assistant helping users understand and discuss articles.
                
                The user is asking questions about the following main article:
                \n--- Main Article ---
                Title: ${articleContext.title}
                Content: ${articleContext.content}
                \n--- End Main Article ---
                ${sourceArticlesContextString}
                
                Instructions:
                You are a helpful assistant designed to answer questions about a specific article and its cited sources. You have access to web search, but it should only be used when necessary. Your goal is to remain grounded in the article while being clear, helpful, and concise.

                Context Usage Guidelines:
                1. Prioritize the main article and its cited sources. These are your primary sources of truth.
                2. Only use web search when:
                - The article and its sources lack the needed information.
                - The user asks about recent developments, unmentioned background, or ongoing events beyond the article's scope.
                3. Ignore outdated or irrelevant search results.
                - Prefer sources that are newer than the article unless referencing foundational or historically significant works.
                - Be selective — don't include web search results just to pad your answer.

                When Using Web Search:
                4. Handle conflicting search results clearly.
                - Summarize the range or disagreement (e.g., “Some sources cite May 19, others May 25”).
                - Don't force a conclusion when the data is inconsistent.
                5. Clearly label sources.
                - Use phrases like “The article mentions…”, “A cited source states…”, or “According to a recent web result…”.
                - Do NOT use inline citations - i.e. [1] or [SOURCE_ARTICLE] or [MAIN_ARTICLE] etc.
                - When a user asks where the information came from, you tell them the title of the article you were referencing, not just the label.
                - Do not talk about how you were searching the web, just state the information you found.

                Relevance and Query Scope:
                6. Gently redirect off-topic or overly general queries.
                - If the question is unrelated to the article, politely decline to answer directly.
                - Instead, reframe or respond with a follow-up question that relates back to the article.
                - Example:
                    User: "What's the capital of Brazil?"
                    Assistant: “That's outside the scope of this article. However, were you curious about Brazil's role in the global AI market, as mentioned in the article?”

                7. Support reasonable tangents that stem from the article's content, even if they become more exploratory over time. Use your judgment, but don't drift too far from the article's themes.

                Response Style:
                8. Be concise. Aim for 1-2 paragraphs unless more detail is requested.
                9. Avoid repetition, hedging, or speculation.
                10. Be transparent when information is uncertain or contradictory.

                Key Principles Recap:
                - Stick to the article unless search is clearly needed.
                - Label your sources — don't mix web data and article content without attribution.
                - Clarify contradictions rather than resolve them prematurely.
                - Gently guide users back to the article's themes if they stray too far.`;
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

        // Add chat history
        if (history && history.length > 0) {
            history.forEach((msg: ChatMessage) => {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            });
        }

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const response = await genAI.models.generateContent({
            model: model,
            contents: contents,
            config: {
                tools: [{ googleSearch: {} }], // Enable Google Search grounding
                responseModalities: ["TEXT"]
            }
        });

        const text = response.text;

        console.log(`[API /api/chat] Generated response with Google Search grounding enabled`);

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