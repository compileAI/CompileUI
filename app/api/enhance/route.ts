import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Article } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
  try {
    const { contentInterests, presentationStyle, article }: {
      contentInterests: string;
      presentationStyle: string;
      article: Article;
    } = await req.json();

    if (!contentInterests || typeof contentInterests !== 'string') {
      return NextResponse.json(
        { error: 'Content interests are required and must be a string' },
        { status: 400 }
      );
    }

    if (!presentationStyle || typeof presentationStyle !== 'string') {
      return NextResponse.json(
        { error: 'Presentation style is required and must be a string' },
        { status: 400 }
      );
    }

    if (!article || !article.title || !article.content) {
      return NextResponse.json(
        { error: 'Article with title and content is required' },
        { status: 400 }
      );
    }

    console.log(`[API /api/enhance] Enhancing article "${article.title}" with content interests: "${contentInterests}" and presentation style: "${presentationStyle}"`);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

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

    const result = await model.generateContent(enhancementPrompt);
    const enhancedContent = result.response.text();

    return NextResponse.json({
      ...article,
      tuned: enhancedContent
    }, { status: 200 });

  } catch (error) {
    console.error('[API /api/enhance] Error:', error);
    return NextResponse.json(
      { error: 'Failed to enhance article' },
      { status: 500 }
    );
  }
} 