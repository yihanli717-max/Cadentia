import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Sentence,
  FeedbackItem,
  FeedbackSourceItem,
  RevisionItem,
} from "@/lib/type";
import { number } from "zod";

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
    { name: "openai-api", skipHydration: true },
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
  clusterDimension: "type" | "provider";
  numericalDimension: "none" | "actionability" | "specificity" | "length";
  colorDimension: "none" | "type" | "provider" | "justification" | "sentiment";
  hoveredProvider: number | null;
  hoveredItem: number | null;
  hoveredSentence: number | null;
  searchedEmeddings: number[] | undefined;
  similarityThreshold: number;
  currentSelectedItems: number[];
  currentRevisionItem: number;
  currentSelectedSentences: number[];
  comparisonMode: boolean;
  bubbleRadii: Record<string, number>;
};

export type SharedConfigActions = {
  setLoading: (loading: boolean) => void;
  setClusterDimension: (dimension: string) => void;
  setNumericalDimension: (dimension: string) => void;
  setColorDimension: (dimension: string) => void;
  setHoveredProvider: (id: number | null) => void;
  setHoveredItem: (id: number | null) => void;
  setHoveredSentence: (id: number | null) => void;
  setSearchedEmbeddings: (embeddings: number[] | undefined) => void;
  setSimilarityThreshold: (threshold: number) => void;
  setCurrentSelectedItems: (feedbacks: number[]) => void;
  setCurrentRevisionItem: (id: number) => void;
  setCurrentSelectedSentences: (sentences: number[]) => void;
  setComparisonMode: (mode: boolean) => void;
  setBubbleRadii: (radii: Record<string, number>) => void;
};

export const useSharedConfigStore = create<
  SharedConfigState & SharedConfigActions
>()(
  persist(
    (set) => ({
      isLoading: false,
      clusterDimension: "provider",
      numericalDimension: "none",
      colorDimension: "none",
      hoveredProvider: null,
      hoveredSentence: null,
      hoveredItem: null,
      searchedEmeddings: undefined,
      similarityThreshold: 0.6,
      currentSelectedItems: [],
      currentRevisionItem: 0,
      currentSelectedSentences: [],
      comparisonMode: false,
      bubbleRadii: {},
      setLoading: (loading: boolean) =>
        set(
          produce((state) => {
            state.isLoading = loading;
          }),
        ),
      setClusterDimension: (dimension: string) =>
        set(
          produce((state) => {
            state.clusterDimension = dimension;
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
      setHoveredProvider: (id: number | null) =>
        set(
          produce((state) => {
            state.hoveredProvider = id;
          }),
        ),
      setHoveredItem: (id: number | null) =>
        set(
          produce((state) => {
            state.hoveredItem = id;
          }),
        ),
      setHoveredSentence: (id: number | null) =>
        set(
          produce((state) => {
            state.hoveredSentence = id;
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

            const allFeedback = useFeedbackStore.getState().feedback;
            const sentenceIds = new Set<number>();

            feedbacks
              .map((id) => allFeedback.find((item) => item.id === id))
              .filter(
                (feedback): feedback is Exclude<typeof feedback, undefined> =>
                  !!feedback,
              )
              .forEach((feedback) => {
                feedback.detection?.forEach((id) => sentenceIds.add(id));
              });

            state.currentSelectedSentences = Array.from(sentenceIds);
          }),
        ),
      setCurrentRevisionItem: (id: number) =>
        set(
          produce((state) => {
            state.currentRevisionItem = id;
          }),
        ),
      setCurrentSelectedSentences: (sentences: number[]) =>
        set(
          produce((state) => {
            state.currentSelectedSentences = sentences;
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
  updateRevisedSentence: (
    id: number,
    original: string,
    newRevision: string,
  ) => void;
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
              conversation: [],
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
                        conversation: target.conversation,
                      }
                    : item,
              );
            } else {
              console.log("target", target);
              state.revisionList.push({
                id: target.id,
                feedback: target.feedback,
                revision: target.revision,
                conversation: target.conversation,
              });
            }
          }),
        );
      },
      updateRevisedSentence: (id, original, newRevision) => {
        set(
          produce((state) => {
            const revisionObject = state.revisionList.find(
              (item: RevisionItem) => item.id === id,
            );
            // console.log("revisionObject", revisionObject);
            if (revisionObject) {
              const revisedSentence = revisionObject.revision.find(
                (item: { original: string; revised: string }) =>
                  item.original === original,
              );
              // console.log("revisedSentence", revisedSentence);
              if (revisedSentence) {
                revisedSentence.revised = newRevision;
              }
            }
          }),
        );
      },
    }),
    { name: "revision-list", skipHydration: false },
  ),
);
