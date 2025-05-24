import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
    try {
        const { message, history, articleContext } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        // Create system message with article context
        const systemMessage = articleContext ? {
            role: 'user',
            parts: [{ text: `You are an AI assistant helping with questions about the following article:
                \n\nTitle: ${articleContext.title}\n\nContent: ${articleContext.content}
                \n\nPlease use this context to provide accurate and relevant responses.` }]
        } : null;

        // Convert chat history to Gemini format
        const chatHistory = history?.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        })) || [];

        // Add system message at the beginning if we have article context
        const fullHistory = systemMessage ? [systemMessage, ...chatHistory] : chatHistory;

        const chat = model.startChat({
            history: fullHistory,
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ 
            message: text 
        }, { status: 200 });

    } catch (error) {
        console.error('Gemini API error:', error);
        return NextResponse.json(
            { error: 'Failed to get response from Gemini API' },
            { status: 500 }
        );
    }
} 