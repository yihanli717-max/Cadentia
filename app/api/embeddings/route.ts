import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { apiKey, model, input } = await req.json();

    // Check for required parameters
    if (!apiKey || !model || !input) {
      return NextResponse.json(
        { error: "Missing required parameters: model or input" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Call OpenAI apiKey to generate embeddings
    const response = await openai.embeddings.create({
      model,
      input: typeof input === "string" ? input.trim() : input,
      encoding_format: "float",
    });

    // Check for valid response structure
    if (!response.data?.[0]?.embedding) {
      return NextResponse.json(
        { error: "Invalid response structure from OpenAI" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      embedding: response.data[0].embedding,
    });
  } catch (error) {
    console.error("Embedding generation error:", error);

    // Handle OpenAI apiKey errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          type: error.type,
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
