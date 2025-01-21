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
  Claim: d3.schemeTableau10[1],
  Reasoning: d3.schemeTableau10[2],
  Evidence: d3.schemeTableau10[5],
  Rebuttal: d3.schemeTableau10[7],
  Others: d3.schemeTableau10[9],
  Organization: d3.schemeTableau10[0],
  "Word-usage": d3.schemeTableau10[3],
  Orthography: d3.schemeTableau10[6],
};

// Utility function for normalization and transformation
export const normalizeAndTransform = (
  values: number[],
  transform: (v: number) => number,
) => {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    // Handle edge case where all values are the same
    return values.map(() => transform(0.5));
  }

  return values.map((value) => transform((value - min) / (max - min)));
};
