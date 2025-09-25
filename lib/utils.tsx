import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OpenAI as OpenAIType } from "openai";
import * as d3 from "d3";
import { diffWords } from "diff";
import { useStudyManagerStore, useOpenAIAPI } from "@/lib/store";
import { Sentence, RevisionItem } from "@/lib/type";
import {
  push,
  ref,
  get,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
  startAfter,
} from "firebase/database";
import { database } from "@/app/firebaseConfig";

export function eventTracker(event: {
  action: string;
  data: object | string | null;
}) {
  const user = useStudyManagerStore.getState().user;
  const ifTracking = useStudyManagerStore.getState().ifTracking;
  if (
    ifTracking &&
    user !== "p0" &&
    user !== "P0" &&
    user !== "frank" &&
    user !== "Frank" &&
    user !== "grace" &&
    user !== "Grace" &&
    user !== "Phyllis" &&
    user !== "phyllis" &&
    user !== "annonymous"
  ) {
    try {
      const condition = useStudyManagerStore.getState().condition;
      const dataset = useStudyManagerStore.getState().dataset;
      const refId = ref(
        database,
        "events/" + user + "/" + condition + "-" + dataset,
      );
      const newEvent = {
        ...event,
        timestamp: Date.now(),
      };

      push(refId, newEvent);
    } catch (error) {
      console.log("event:", event);
      console.error("Error tracking event:", error);
    }
  }
}

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

export const categoryColorMap: {
  [key: string]: string;
} = {
  Claim: categoryColor[1],
  Reasoning: categoryColor[2],
  Evidence: categoryColor[8],
  Rebuttal: categoryColor[5],
  Others: categoryColor[7],
  Organization: categoryColor[0],
  "Word-usage": categoryColor[3],
  Orthography: categoryColor[6],
  1: categoryColor[2],
  0: categoryColor[0],
};

export const clusterColorScales: {
  [key: string]: d3.ScaleOrdinal<string, string>;
} = {
  provider: d3.scaleOrdinal(categoryColor),
  type: d3.scaleOrdinal(categoryColor),
};

export const getClusterColor = (clusterDimension: string) => {
  if (clusterDimension === "type") {
    return (group: string) => categoryColorMap[group] || categoryColor[8];
  } else if (clusterDimension === "provider") {
    const colorScale = clusterColorScales.provider;
    return (group: string) => colorScale(group);
  } else if (clusterDimension === "justification") {
    return (group: string) => categoryColorMap[group] || categoryColor[8];
  } else {
    return (group: string) => categoryColor[5];
  }
};

export const sequentialColorScales: {
  [key: string]: d3.ScaleSequential<string>;
} = {
  sentiment: d3.scaleSequential(d3.interpolateRdYlGn).domain([-0.6, 0.6]),
};

export const getSequentialColor = (colorDimension: string) => {
  if (colorDimension === "sentiment") {
    const colorScale = sequentialColorScales[colorDimension];
    return (value: number) => colorScale(value);
  } else {
    const colorScale = sequentialColorScales.justification;
    return (value: number) => colorScale(value);
  }
};

export const getColor = (colorDimension: string) => {
  if (colorDimension === "sentiment") {
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
  model: string = "text-embedding-3-large",
): Promise<number[]> {
  let embedding: number[] = [];
  const apiKey = useOpenAIAPI.getState().API;
  console.log("111:", apiKey);
  try {
    const response = await fetch("/api/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // apiKey: useOpenAIAPI.getState().API,
        model: model,
        input: text,
        apiKey: apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Embedding generation failed");
    }

    const data = await response.json();
    embedding = data.embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }

  return embedding;
}

export async function Regenerate(
  conversation: OpenAIType.ChatCompletionMessageParam[],
  prompt: string,
) {
  const apiKey = useOpenAIAPI.getState().API;
  console.log("111:", apiKey);

  const payload = {
    // apiKey: useOpenAIAPI.getState().API,
    conversation: conversation,
    prompt: prompt,
    apiKey: apiKey,
  };

  try {
    const response = await fetch("/api/regeneration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();
    return data.revision;
  } catch (error) {
    console.error("Revision failed:", error);
    return null;
  }
}

export async function generateRevision(
  prompt: string,
  essay: Sentence[],
  feedbackList: string[],
  sentenceList: string[],
) {
  const apiKey = useOpenAIAPI.getState().API;
  console.log("111:", apiKey);

  const payload = {
    // apiKey: useOpenAIAPI.getState().API,
    prompt: prompt,
    essay: essay,
    feedbackList: feedbackList,
    sentenceList: sentenceList,
    apiKey: apiKey,
  };

  try {
    const response = await fetch("/api/revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();
    return { conversation: data.conversation, response: data.revision };
  } catch (error) {
    console.error("Revision failed:", error);
    return null;
  }
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
  claim: "CL",
  reasoning: "WA",
  evidence: "EV",
  rebuttal: "RE",
  orthography: "CO",
  organization: "OR",
  "word-usage": "WO",
  others: "GE",
  alex: "P1",
  jeff: "P2",
  jun: "P3",
  april: "P4",
  ai: "P5",
  "essayforum r1": "P6",
  "essayforum r2": "P7",
  "essayforum r3": "P8",
  "essayforum r4": "P9",
  "essayforum r5": "P10",
  "1": "Justified",
  "0": "Not Justified",
};
