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
  Claim: d3.schemeTableau10[1], // 红色
  Reasoning: d3.schemeTableau10[2], // 橙色
  Evidence: d3.schemeTableau10[5], // 黄色/绿色（偏暖）
  Rebuttal: d3.schemeTableau10[7], // 深粉/暖色调蓝
  Others: d3.schemeTableau10[9], // 紫色（冷色中性）
  Organization: d3.schemeTableau10[0], // 棕色
  "Word-usage": d3.schemeTableau10[3], // 青色
  Orthography: d3.schemeTableau10[6], // 灰色
};
