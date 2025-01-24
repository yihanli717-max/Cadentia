import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import OpenAI from "openai";
import { useOpenAIAPI } from "@/lib/store";
import * as d3 from "d3";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSimilarSentence(
  sentence: string,
  contentSentences: string[],
) {
  const words = sentence.toLowerCase().split(/\W+/).filter(Boolean);
  return contentSentences.some((contentSentence) => {
    const contentWords = contentSentence
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean);
    const commonWords = words.filter((word) => contentWords.includes(word));
    const similarity =
      commonWords.length / Math.max(words.length, contentWords.length);
    return similarity >= 0.65;
  });
}

// Utility function for normalization and transformation
export const normalizeAndTransform = (
  values: number[],
  transform: (v: number) => number,
) => {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    // Handle edge case where all values are the same
    return values.map(() => transform(0.55)); // 0.55 is the middle of the range [0.1, 1]
  }

  return values.map((value) => {
    const normalized = (value - min) / (max - min); // Map to [0, 1]
    const scaled = normalized * 0.9 + 0.1; // Map to [0.1, 1]
    return transform(scaled);
  });
};

export const categoryColorMap: {
  [key: string]: string;
} = {
  Claim: d3.schemeTableau10[1],
  Reasoning: d3.schemeTableau10[2],
  Evidence: d3.schemeTableau10[5],
  Rebuttal: d3.schemeTableau10[7],
  Others: d3.schemeTableau10[9],
  Organization: d3.schemeTableau10[0],
  "Word-usage": d3.schemeTableau10[3],
  Orthography: d3.schemeTableau10[6],
};

const colorScales: { [key: string]: d3.ScaleOrdinal<string, string> } = {
  provider: d3.scaleOrdinal(d3.schemeTableau10),
  type: d3.scaleOrdinal(d3.schemeTableau10),
};

export const getColor = (categoricalDimension: string) => {
  if (categoricalDimension === "type") {
    return (group: string) => categoryColorMap[group] || d3.schemeTableau10[8];
  } else if (categoricalDimension === "provider") {
    const colorScale = colorScales.provider;
    return (group: string) => colorScale(group);
  } else {
    return (group: string) => d3.schemeTableau10[0];
  }
};

export const countWords = (text: string) => {
  const words = text.match(/\b\w+\b/g);
  return words ? words.length : 0;
};

export async function getEmbedding(
  text: string,
  model: string = "text-embedding-3-small",
): Promise<number[]> {
  const API = useOpenAIAPI.getState().API;
  const openai = new OpenAI({
    apiKey: API,
    dangerouslyAllowBrowser: true,
  });

  const response = await openai.embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}
