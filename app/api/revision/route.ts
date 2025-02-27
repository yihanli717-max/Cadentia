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
    const { prompt, essay, feedbackList, sentenceList } = await req.json();

    // Validate required parameters
    if (!essay || !feedbackList || !sentenceList) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: api key, essay, feedback, or sentence",
        },
        { status: 400 },
      );
    }

    // Concatenate essay paragraphs
    const paragraphMap = essay.reduce(
      (acc: Record<number, string>, sentence: Sentence) => {
        const para = sentence.paragraph;
        acc[para] =
          (acc[para] || "") + (acc[para] ? " " : "") + sentence.content;
        return acc;
      },
      {},
    );

    const concatenatedEssay = Object.values(paragraphMap).join("\n");

    // Construct conversation messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `As a professional writer, you have received feedback on your essay and have been asked to revise specific sentences that need improvement. Your task is to carefully revise the given sentences based on the feedback received, ensuring that the original meaning is maintained and considering the context of the sentences in the essay.\nEssay: '${concatenatedEssay}'`,
      },
      {
        role: "user",
        content:
          prompt +
          "\n\n" +
          "--------Feedback--------\n" +
          feedbackList.join("\n") +
          "\n------------------------------\n\n" +
          "--------Sentence--------\n" +
          sentenceList.join("\n") +
          "\n------------------------------",
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
