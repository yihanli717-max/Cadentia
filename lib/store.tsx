import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Sentence,
  FeedbackItem,
  FeedbackSourceItem,
  RevisionItem,
} from "@/lib/type";
import { eventTracker } from "@/lib/utils";

export type OpenAIAPIState = {
  API: string;
};

export type OpenAIAPIActions = {
  setAPI: (API: string) => void;
};

export const useOpenAIAPI = create<OpenAIAPIState & OpenAIAPIActions>()(
  persist(
    (set) => ({
      API: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
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
    { name: "essay", skipHydration: true },
  ),
);

export type FeedbackSourceState = {
  feedbackSource: FeedbackSourceItem[];
};

export type FeedbackSourceActions = {
  setFeedbackSource: (feedbackSource: FeedbackSourceItem[]) => void;
};

export const useFeedbackSourceStore = create<
  FeedbackSourceState & FeedbackSourceActions
>()(
  persist(
    (set) => ({
      feedbackSource: [],
      setFeedbackSource: (feedbackSource: FeedbackSourceItem[]) =>
        set({ feedbackSource }),
    }),
    { name: "feedbackSource", skipHydration: true },
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
    { name: "feedback", skipHydration: true },
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
  currentRemovedSentences: number[];
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
  setCurrentRemovedSentences: (sentences: number[]) => void;
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
      currentRemovedSentences: [],
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
            eventTracker({
              action: "change dimension",
              data: {
                type: "cluster",
                dimension: dimension,
              },
            });
          }),
        ),
      setNumericalDimension: (dimension: string) =>
        set(
          produce((state) => {
            state.numericalDimension = dimension;
            eventTracker({
              action: "change dimension",
              data: {
                type: "numerical",
                dimension: dimension,
              },
            });
          }),
        ),
      setColorDimension: (dimension: string) =>
        set(
          produce((state) => {
            state.colorDimension = dimension;
            eventTracker({
              action: "change dimension",
              data: {
                type: "color",
                dimension: dimension,
              },
            });
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
            eventTracker({
              action: "change similarity threshold",
              data: {
                threshold: threshold,
              },
            });
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
      setCurrentRemovedSentences: (sentences: number[]) =>
        set(
          produce((state) => {
            state.currentRemovedSentences = sentences;
          }),
        ),
    }),
    { name: "shared-config", skipHydration: true },
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
    { name: "revision-list", skipHydration: true },
  ),
);

export type studyManagerState = {
  user: string;
  condition: "synthia" | "test";
  dataset: number;
};

export type studyManagerActions = {
  setUser: (user: string) => void;
  setCondition: (condition: string) => void;
  setDataset: (dataset: number) => void;
};

export const useStudyManagerStore = create<
  studyManagerState & studyManagerActions
>()(
  persist(
    (set) => ({
      user: "P0",
      condition: "synthia",
      dataset: 0,
      setUser: (user: string) =>
        set(
          produce((state) => {
            state.user = user;
          }),
        ),
      setCondition: (condition: string) =>
        set(
          produce((state) => {
            state.condition = condition;
          }),
        ),
      setDataset: (dataset: number) =>
        set(
          produce((state) => {
            state.dataset = dataset;
          }),
        ),
    }),
    { name: "study-manager", skipHydration: true },
  ),
);
