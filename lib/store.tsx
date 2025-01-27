import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Sentence,
  FeedbackItem,
  FeedbackSourceItem,
  RevisionItem,
} from "@/lib/type";

export type OpenAIAPIState = {
  API: string;
};

export type OpenAIAPIActions = {
  setAPI: (API: string) => void;
};

export const useOpenAIAPI = create<OpenAIAPIState & OpenAIAPIActions>()(
  persist(
    (set) => ({
      API: "",
      setAPI: (API: string) => set({ API: API }),
    }),
    { name: "openai-api", skipHydration: false },
  ),
);

export type EssayState = {
  essay: Sentence[];
};

export type EssayActions = {
  setEssay: (essay: Sentence[]) => void;
};

export const useEssayStore = create<EssayState & EssayActions>()(
  persist(
    (set) => ({
      essay: [],
      setEssay: (essay: Sentence[]) => set({ essay }),
    }),
    { name: "essay", skipHydration: false },
  ),
);

export type FeedbackState = {
  feedback: FeedbackItem[];
};

export type FeedbackActions = {
  setFeedback: (feedback: FeedbackItem[]) => void;
  getFeedbackById: (id: number) => FeedbackItem | undefined;
};

export const useFeedbackStore = create<FeedbackState & FeedbackActions>()(
  persist(
    (set, get) => ({
      feedback: [],
      setFeedback: (feedback: FeedbackItem[]) => set({ feedback }),
      getFeedbackById: (id: number) =>
        get().feedback.find((item) => item.id === id),
    }),
    { name: "feedback", skipHydration: false },
  ),
);

export type SharedConfigState = {
  categoricalDimension: "type" | "provider";
  numericalDimension:
    | "helpfulness"
    | "actionability"
    | "justification"
    | "sentiment"
    | "specificity"
    | "length";
  hoveredItem: number | null;
  searchedEmeddings: number[] | undefined;
  similarityThreshold: number;
  currentSelectedItems: number[];
  currentRevisionItem: number;
};

export type SharedConfigActions = {
  setCategoricalDimension: (dimension: string) => void;
  setNumericalDimension: (dimension: string) => void;
  setHoveredItem: (id: number | null) => void;
  setSearchedEmbeddings: (embeddings: number[] | undefined) => void;
  setSimilarityThreshold: (threshold: number) => void;
  setCurrentSelectedItems: (feedbacks: number[]) => void;
  setCurrentRevisionItem: (id: number) => void;
};

export const useSharedConfigStore = create<
  SharedConfigState & SharedConfigActions
>()(
  persist(
    (set) => ({
      categoricalDimension: "type",
      numericalDimension: "actionability",
      hoveredItem: null,
      searchedEmeddings: undefined,
      similarityThreshold: 0.6,
      currentSelectedItems: [],
      currentRevisionItem: 0,
      setCategoricalDimension: (dimension: string) =>
        set(
          produce((state) => {
            state.categoricalDimension = dimension;
          }),
        ),
      setNumericalDimension: (dimension: string) =>
        set(
          produce((state) => {
            state.numericalDimension = dimension;
          }),
        ),
      setHoveredItem: (id: number | null) =>
        set(
          produce((state) => {
            state.hoveredItem = id;
          }),
        ),
      setSearchedEmbeddings: (embeddings: number[] | undefined) =>
        set(
          produce((state) => {
            // console.log("embeddings", embeddings);
            state.searchedEmeddings = embeddings;
          }),
        ),
      setSimilarityThreshold: (threshold: number) =>
        set(
          produce((state) => {
            state.similarityThreshold = threshold;
          }),
        ),
      setCurrentSelectedItems: (feedbacks: number[]) =>
        set(
          produce((state) => {
            state.currentSelectedItems = feedbacks;
          }),
        ),
      setCurrentRevisionItem: (id: number) =>
        set(
          produce((state) => {
            state.currentRevisionItem = id;
          }),
        ),
    }),
    { name: "shared-config", skipHydration: true },
  ),
);

export type RevisionListState = {
  revisionList: {
    id: number;
    feedback: number[];
    revision: RevisionItem[];
  }[];
};

export type RevisionListActions = {
  setRevisionList: (
    revisionList: {
      id: number;
      feedback: number[];
      revision: RevisionItem[];
    }[],
  ) => void;
};

export const useRevisionListStore = create<
  RevisionListState & RevisionListActions
>()(
  persist(
    (set) => ({
      revisionList: [],
      setRevisionList: (revisionList) => set({ revisionList }),
    }),
    { name: "revision-list", skipHydration: false },
  ),
);
