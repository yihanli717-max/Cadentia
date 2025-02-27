import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define Zod schema for response validation
const Revision = z.object({
  revision: z.array(
    z.object({
      original: z.string(),
      revised: z.string(),
    }),
  ),
});

interface Sentence {
  paragraph: number;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { conversation, prompt } = await req.json();

    // Validate required parameters
    if (!conversation || !prompt) {
      return NextResponse.json(
        {
          error: "Missing required parameters: api key, conversation or prompt",
        },
        { status: 400 },
      );
    }

    // Construct conversation messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      ...conversation,
      {
        role: "user",
        content: prompt,
      },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      response_format: zodResponseFormat(Revision, "revision"),
    });

    return NextResponse.json({
      revision: completion.choices[0].message.content,
      conversation: messages,
    });
  } catch (error) {
    console.error("Revision error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
