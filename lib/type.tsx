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

export type HowItem = {
  title: string;
  strategy: string;
};

export type GPTPlan = {
  sentence: string;
  what: number[];
  why: string;
  how: HowItem[];
};

export type FeedbackItem = {
  id: number;
  content: string;
  length?: number;
  actionability: number;
  justification: number;
  sentiment: number;
  specificity: number;
  engagement: number;
  source: number;
  type: string;
  provider: string;
  plan: GPTPlan[];
  addressed: boolean;
};

export type FeedbackSourceItem = {
  id: number;
  content: string;
  provider: string;
};

export type RevisionItem = {
  revision: string;
  better: boolean;
  explanation: string;
};

export type Revision = {
  id: number;
  sentence: string;
  revision: RevisionItem[];
};
