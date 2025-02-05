import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as d3 from "d3";
import { diffWords } from "diff";
import { useOpenAIAPI } from "@/lib/store";
import { Sentence, RevisionItem } from "@/lib/type";

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
    const scaled = normalized * 0.8 + 0.2; // Map to [0.2, 1]
    return transform(scaled);
  });
};

// @ts-expect-error
const categoryColor = d3.schemeObservable10;

const categoryColorMap: {
  [key: string]: string;
} = {
  Claim: categoryColor[1],
  Reasoning: categoryColor[2],
  Evidence: categoryColor[8],
  Rebuttal: categoryColor[5],
  Others: categoryColor[9],
  Organization: categoryColor[0],
  "Word-usage": categoryColor[3],
  Orthography: categoryColor[6],
};

const clusterColorScales: { [key: string]: d3.ScaleOrdinal<string, string> } = {
  provider: d3.scaleOrdinal(categoryColor),
  type: d3.scaleOrdinal(categoryColor),
};

export const getClusterColor = (categoricalDimension: string) => {
  if (categoricalDimension === "type") {
    return (group: string) => categoryColorMap[group] || categoryColor[8];
  } else if (categoricalDimension === "provider") {
    const colorScale = clusterColorScales.provider;
    return (group: string) => colorScale(group);
  } else {
    return (group: string) => categoryColor[0];
  }
};

const sequentialColorScales: {
  [key: string]: d3.ScaleSequential<string>;
} = {
  justification: d3.scaleSequential(d3.interpolateGnBu).domain([-2, 2]),
  sentiment: d3.scaleSequential(d3.interpolateRdYlGn).domain([-0.6, 0.6]),
};

export const getSequentialColor = (colorDimension: string) => {
  if (colorDimension === "justification" || colorDimension === "sentiment") {
    const colorScale = sequentialColorScales[colorDimension];
    return (value: number) => colorScale(value);
  } else {
    const colorScale = sequentialColorScales.justification;
    return (value: number) => colorScale(value);
  }
};

export const getColor = (colorDimension: string) => {
  if (colorDimension === "justification" || colorDimension === "sentiment") {
    return getSequentialColor(colorDimension);
  } else {
    return getClusterColor(colorDimension);
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

export async function generateRevision(
  essay: Sentence[],
  feedbackList: string[],
  sentenceList: string[],
) {
  const API = useOpenAIAPI.getState().API;
  const openai = new OpenAI({
    apiKey: API,
    dangerouslyAllowBrowser: true,
  });

  // Contactanate the feedbacks
  const connectedFeedback = feedbackList.join(" ");

  // Contactanate the essay by paragraphs
  const connectedEssay = Object.values(
    essay.reduce(
      (result, sentence) => {
        // Get the paragraph number of the current sentence
        const paragraph = sentence.paragraph;

        // If the paragraph is not in the result object, initialize it as an empty string
        if (!result[paragraph]) {
          result[paragraph] = "";
        }

        // Concatenate the sentence content to the paragraph
        result[paragraph] += (result[paragraph] ? " " : "") + sentence.content;

        return result;
      },
      {} as Record<number, string>,
    ),
  ).join("\n");

  const Revision = z.object({
    revision: z.array(
      z.object({
        original: z.string(),
        revised: z.string(),
      }),
    ),
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "As a professional writer, you have received feedback on your essay and have been asked to revise specific sentences that need improvement. Your task is to carefully revise the given sentences based on the feedback received, ensuring that the original meaning is maintained and considering the context of the sentences in the essay.\n" +
          `Essay: '${connectedEssay}`,
      },
      {
        role: "user",
        content:
          `The feedback you received: '${connectedFeedback}'\n\n` +
          `The sentences you need to revise: '${sentenceList.join("\n")}'`,
      },
    ],
    temperature: 0.7,
    response_format: zodResponseFormat(Revision, "revision"),
  });

  return response.choices[0].message.content;
}

export function getInterpolateColor(
  color: "red" | "green" | "blue" = "green",
  max: number,
) {
  if (color === "red") {
    return d3
      .scaleSequential()
      .domain([0, max])
      .interpolator(d3.interpolateReds);
  } else if (color === "blue") {
    return d3
      .scaleSequential()
      .domain([0, max])
      .interpolator(d3.interpolateBlues);
  }
  return d3
    .scaleSequential()
    .domain([0, max])
    .interpolator(d3.interpolateGreens);
}

export function collectStats(revisionItems: RevisionItem[]): {
  maxAdded: number;
  maxDeleted: number;
  maxTotal: number;
} {
  let maxAdded = 0;
  let maxDeleted = 0;
  let maxTotal = 0;

  for (const item of revisionItems) {
    const { added, deleted } = countWordChanges(item);
    maxAdded = Math.max(maxAdded, added);
    maxDeleted = Math.max(maxDeleted, deleted);
    maxTotal = Math.max(maxTotal, added + deleted);
  }

  return { maxAdded, maxDeleted, maxTotal };
}

export function countWordChanges(revisionItem: RevisionItem): {
  added: number;
  deleted: number;
} {
  let addedWords = 0;
  let deletedWords = 0;

  for (const { original, revised } of revisionItem.revision) {
    const diffs = diffWords(original, revised);

    for (const diff of diffs) {
      if (diff.added) {
        const words = diff.value.trim().split(/\s+/);
        addedWords += words.filter((word) => word.length > 0).length;
      } else if (diff.removed) {
        const words = diff.value.trim().split(/\s+/);
        deletedWords += words.filter((word) => word.length > 0).length;
      }
    }
  }

  return { added: addedWords, deleted: deletedWords };
}

export const typeMap = {
  claim: "Claims/Ideas",
  reasoning: "Warrent/Reasoning/Backing",
  evidence: "Evidence",
  rebuttal: "Rebuttal/Reservation",
  others: "General Content",
  orthography: "Convention/Grammar/Spelling",
  organization: "Organization",
  "word-usage": "Word Usage/Clarity",
};
