import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SourceArticleContext } from "@/types";
import { createClientForServer } from "@/utils/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// We post to this route from ChatPageClient.tsx, this is the API endpoint for the chat.
// Currently it joins the gen_article and source_articles tables to get the source articles for the article.
// - deduplicates the source articles and returns them in a string.
// - sends the message to the Gemini model.
// - returns the response from the Gemini model.
export async function POST(req: Request) {
    try {
        // Expect message (question), history (chat history), and articleContext (article id, title, and content) from the client.
        const { message, history, articleContext } = await req.json();

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

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        // Create system message with article context
        const systemMessageParts = [];
        if (articleContext.title && articleContext.content) {
            systemMessageParts.push({
                text: `You are an AI assistant.
                The user is asking questions about the following main article:
                \n--- Main Article ---
                Title: ${articleContext.title}
                Content: ${articleContext.content}
                \n--- End Main Article ---
                ${sourceArticlesContextString}
                Please use all the provided context (main article and any source articles) to provide accurate and relevant responses. If relevant, you can cite information from the source articles.`
            });
        } else {
            systemMessageParts.push({ text: "You are a helpful AI assistant." });
        }

        const systemInstruction = {
            role: 'user', // For Gemini, system-like instructions are often placed as the first user message
            parts: systemMessageParts
        };

        // Convert chat history to Gemini format
        const chatHistory = history?.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        })) || [];

        // The "system instruction" should effectively be the first turn for the model if it contains context.
        // Or, if you use the `system_instruction` field available in some Gemini SDK versions/models:
        // const chat = model.startChat({
        //     history: chatHistory,
        //     systemInstruction: { // This is the preferred way if your SDK version supports it well
        //         role: "system", // or "user" depending on model/SDK specifics for system prompts
        //         parts: systemMessageParts,
        //     }
        // });

        // More common way: prepend system instructions to history
        const fullHistoryForGemini = [systemInstruction, ...chatHistory];


        const chat = model.startChat({
            history: fullHistoryForGemini,
            // generationConfig: { // Optional: configure temperature, topP, etc.
            //   maxOutputTokens: 2048,
            // },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

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