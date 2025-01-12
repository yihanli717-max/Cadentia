import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
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

export const categoryColorMap: {
  [key: string]: string;
} = {
  Claim: "#ec4899",
  Reasoning: "#ef4444",
  Evidence: "#f97316",
  Rebuttal: "#f59e0b",
  Others: "#78716c",
  Organization: "#3b82f6",
  "Word-usage": "#06b6d4",
  Orthography: "#8b5cf6",
};
