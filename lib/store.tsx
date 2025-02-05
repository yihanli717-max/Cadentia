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
};

export const useFeedbackStore = create<FeedbackState & FeedbackActions>()(
  persist(
    (set, get) => ({
      feedback: [],
      setFeedback: (feedback: FeedbackItem[]) =>
        set(
          produce((state) => {
            state.feedback = feedback;
          }),
        ),
    }),
    { name: "feedback", skipHydration: false },
  ),
);

export type SharedConfigState = {
  isLoading: boolean;
  categoricalDimension: "type" | "provider";
  numericalDimension: "actionability" | "specificity" | "length";
  colorDimension: "type" | "provider" | "justification" | "sentiment";
  hoveredItem: number | null;
  searchedEmeddings: number[] | undefined;
  similarityThreshold: number;
  currentSelectedItems: number[];
  currentRevisionItem: number;
  comparisonMode: boolean;
  bubbleRadii: Record<string, number>;
};

export type SharedConfigActions = {
  setLoading: (loading: boolean) => void;
  setCategoricalDimension: (dimension: string) => void;
  setNumericalDimension: (dimension: string) => void;
  setColorDimension: (dimension: string) => void;
  setHoveredItem: (id: number | null) => void;
  setSearchedEmbeddings: (embeddings: number[] | undefined) => void;
  setSimilarityThreshold: (threshold: number) => void;
  setCurrentSelectedItems: (feedbacks: number[]) => void;
  setCurrentRevisionItem: (id: number) => void;
  setComparisonMode: (mode: boolean) => void;
  setBubbleRadii: (radii: Record<string, number>) => void;
};

export const useSharedConfigStore = create<
  SharedConfigState & SharedConfigActions
>()(
  persist(
    (set) => ({
      isLoading: false,
      categoricalDimension: "provider",
      numericalDimension: "actionability",
      colorDimension: "sentiment",
      hoveredItem: null,
      searchedEmeddings: undefined,
      similarityThreshold: 0.6,
      currentSelectedItems: [],
      currentRevisionItem: 0,
      comparisonMode: false,
      bubbleRadii: {},
      setLoading: (loading: boolean) =>
        set(
          produce((state) => {
            state.isLoading = loading;
          }),
        ),
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
      setColorDimension: (dimension: string) =>
        set(
          produce((state) => {
            state.colorDimension = dimension;
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
      setComparisonMode: (mode: boolean) =>
        set(
          produce((state) => {
            state.comparisonMode = mode;
          }),
        ),
      setBubbleRadii: (radii: Record<string, number>) =>
        set(
          produce((state) => {
            state.bubbleRadii = radii;
          }),
        ),
    }),
    { name: "shared-config", skipHydration: false },
  ),
);

export type RevisionListState = {
  revisionList: RevisionItem[];
};

export type RevisionListActions = {
  setRevisionList: (revisionList: RevisionItem[]) => void;
  createRevision: () => void;
  updateRevision: (target: RevisionItem) => void;
};

export const useRevisionListStore = create<
  RevisionListState & RevisionListActions
>()(
  persist(
    (set) => ({
      revisionList: [],
      setRevisionList: (revisionList) => set({ revisionList }),
      createRevision: () =>
        set(
          produce((state) => {
            state.revisionList.push({
              id: state.revisionList.length,
              feedback: [],
              revision: [],
            });
          }),
        ),
      updateRevision: (target) => {
        set(
          produce((state) => {
            const existingRevision = state.revisionList.find(
              (item: RevisionItem) => item.id === target.id,
            );
            if (existingRevision) {
              state.revisionList = state.revisionList.map(
                (item: RevisionItem) =>
                  item.id === target.id
                    ? {
                        ...item,
                        feedback: target.feedback,
                        revision: target.revision,
                      }
                    : item,
              );
            } else {
              state.revisionList.push({
                id: target.id,
                feedback: target.feedback,
                revision: target.revision,
              });
            }
          }),
        );
      },
    }),
    { name: "revision-list", skipHydration: false },
  ),
);
