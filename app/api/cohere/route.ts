import { NextResponse } from "next/server";
import { CohereClientV2 } from "cohere-ai";

const cohere = new CohereClientV2({
    token: process.env.COHERE_API_KEY,
});

const promptQuestion = "Discuss developments in the field reasoning models";

const promptFramework = "Using the following articles as references, generate a short news article on the provided [TOPIC]. "
+ "Specifically, generate a succinct, catchy news headline and a short article. Do not start your response with any acknowledgment "
+ "of the question, only return the generated title followed by the summary. Reference as many of the following sources as you can, while ensureing the information stays relevant to the [TOPIC]. "
+ "Do not exceed approximately 150 words in your summary. "
+ "Structure your response in XML using the format: <title>{Generated Title}</title><summary>{Generated Summary}</summary>"
+ `[TOPIC]: ${promptQuestion}. Reference articles: `;

export async function POST(req: Request) {
    try {
        const bodyJson: object[] = await req.json();

        const response = await cohere.chat({
            model: 'command-r-plus-08-2024',
            messages: [
                {
                    role: 'user',
                    content: promptFramework + JSON.stringify(bodyJson),
                },
            ],
        });

        if (response.finishReason !== 'COMPLETE') {
            return NextResponse.json(
                { error: 'Cohere API did not complete successfully. Returned: ' + response.finishReason },
                { status: 500 }
            );
        } else {
            return NextResponse.json({ message: response.message.content }, { status: 200 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Error returned from Cohere API: ' + error }, { status: 500 });
    }
}