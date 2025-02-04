export type Category =
  | "claim"
  | "reasoning"
  | "evidence"
  | "rebuttal"
  | "organization"
  | "word-usage"
  | "orthography"
  | "others";

export type Sentence = {
  id: number;
  content: string;
  paragraph: number;
};

export type FeedbackItem = {
  source: number;
  provider: string;
  content: string;
  type: string;
  actionability: number;
  specificity: number;
  justification: number;
  sentiment: number;
  id: number;
  detection: number[];
  sentence_count: number;
  word_count: number;
  length?: number;
  embeddings?: number[];
};

export type FeedbackSourceItem = {
  id: number;
  content: string;
  provider: string;
};

export type RevisionItem = {
  id: number;
  feedback: number[];
  revision: {
    original: string;
    revised: string;
  }[];
};
