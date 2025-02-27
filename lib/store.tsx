import { produce } from "immer";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import {
  Sentence,
  FeedbackItem,
  FeedbackSourceItem,
  RevisionItem,
} from "@/lib/type";
import { eventTracker } from "@/lib/utils";
import { cluster } from "d3";

// export type OpenAIAPIState = {
//   API: string;
// };

// export type OpenAIAPIActions = {
//   setAPI: (API: string) => void;
// };

// export const useOpenAIAPI = create<OpenAIAPIState & OpenAIAPIActions>()(
//   persist(
//     (set) => ({
//       API: process.env.OPENAI_API_KEY || "",
//       setAPI: (API: string) => set({ API: API }),
//     }),
//     { name: "openai-api", skipHydration: true },
//   ),
// );

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
  currentReferenceSentence: number | null;
};

export type SharedConfigActions = {
  setLoading: (loading: boolean) => void;
  setClusterDimension: (dimension: "type" | "provider") => void;
  setNumericalDimension: (
    dimension: "none" | "actionability" | "specificity" | "length",
  ) => void;
  setColorDimension: (
    dimension: "none" | "type" | "provider" | "justification" | "sentiment",
  ) => void;
  setHoveredProvider: (id: number | null) => void;
  setHoveredItem: (id: number | null) => void;
  setHoveredSentence: (id: number | null) => void;
  setSearchedEmbeddings: (embeddings: number[] | undefined) => void;
  setSimilarityThreshold: (threshold: number) => void;
  updateCurrentSelectedItems: (feedbacks: number[]) => void;
  setCurrentSelectedItems: (feedbacks: number[]) => void;
  setCurrentRevisionItem: (id: number) => void;
  setCurrentSelectedSentences: (sentences: number[]) => void;
  setComparisonMode: (mode: boolean) => void;
  setBubbleRadii: (radii: Record<string, number>) => void;
  setCurrentRemovedSentences: (sentences: number[]) => void;
  setCurrentReferenceSentence: (sentence: number | null) => void;
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
      currentReferenceSentence: null,
      setLoading: (loading: boolean) =>
        set(
          produce((state) => {
            state.isLoading = loading;
          }),
        ),
      setClusterDimension: (dimension: "type" | "provider") =>
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

            const currentRevisionItem =
              useSharedConfigStore.getState().currentRevisionItem;
            const revisionList = useRevisionListStore.getState().revisionList;
            const currentRevision = revisionList.find(
              (item) => item.id === currentRevisionItem,
            );
            const { updateRevision } = useRevisionListStore.getState();
            if (currentRevision) {
              updateRevision({
                ...currentRevision,
                clusterDimension: dimension,
              });
            }
          }),
        ),
      setNumericalDimension: (
        dimension: "none" | "actionability" | "specificity" | "length",
      ) =>
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

            const currentRevisionItem =
              useSharedConfigStore.getState().currentRevisionItem;
            const revisionList = useRevisionListStore.getState().revisionList;
            const currentRevision = revisionList.find(
              (item) => item.id === currentRevisionItem,
            );
            const { updateRevision } = useRevisionListStore.getState();
            if (currentRevision) {
              updateRevision({
                ...currentRevision,
                numericalDimension: dimension,
              });
            }
          }),
        ),
      setColorDimension: (
        dimension: "none" | "type" | "provider" | "justification" | "sentiment",
      ) =>
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

            const currentRevisionItem =
              useSharedConfigStore.getState().currentRevisionItem;
            const revisionList = useRevisionListStore.getState().revisionList;
            const currentRevision = revisionList.find(
              (item) => item.id === currentRevisionItem,
            );
            const { updateRevision } = useRevisionListStore.getState();
            if (currentRevision) {
              updateRevision({
                ...currentRevision,
                colorDimension: dimension,
              });
            }
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
            console.log("set current selected items");
            state.currentSelectedItems = feedbacks;

            eventTracker({
              action: "set selected feedback",
              data: {
                feedbacks: feedbacks,
              },
            });

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

            console.log("sentenceIds", sentenceIds);
            state.currentSelectedSentences = Array.from(sentenceIds);
          }),
        ),
      updateCurrentSelectedItems: (feedbacks: number[]) =>
        set(
          produce((state) => {
            console.log("update current selected items");
            // Find added and removed feedback items
            const oldSelectedItems = state.currentSelectedItems;
            const addedItems = feedbacks.filter(
              (id: number) => !oldSelectedItems.includes(id),
            );
            const removedItems = oldSelectedItems.filter(
              (id: number) => !feedbacks.includes(id),
            );

            console.log("addedItems", addedItems);
            console.log("removedItems", removedItems);

            // Update currentSelectedItems
            state.currentSelectedItems = feedbacks;

            // Track the event
            eventTracker({
              action: "update selected feedback",
              data: {
                feedbacks: feedbacks,
              },
            });

            const allFeedback = useFeedbackStore.getState().feedback;

            // If no changes, exit early
            if (addedItems.length === 0 && removedItems.length === 0) {
              return;
            }

            // If there are only additions (no removals), add their sentence IDs to the current set
            if (addedItems.length > 0 && removedItems.length === 0) {
              const currentSentenceIds = new Set(
                state.currentSelectedSentences,
              );

              addedItems
                .map((id) => allFeedback.find((item) => item.id === id))
                .filter(
                  (feedback): feedback is Exclude<typeof feedback, undefined> =>
                    !!feedback,
                )
                .forEach((feedback) => {
                  feedback.detection?.forEach((id) =>
                    currentSentenceIds.add(id),
                  );
                });

              state.currentSelectedSentences = Array.from(currentSentenceIds);
            }
            // If there are any removals, recalculate the entire set of sentence IDs
            else if (removedItems.length > 0) {
              const currentSentenceIds = new Set(
                state.currentSelectedSentences,
              );

              removedItems
                .map((id: number) => allFeedback.find((item) => item.id === id))
                .filter(
                  (
                    feedback: FeedbackItem,
                  ): feedback is Exclude<typeof feedback, undefined> =>
                    !!feedback,
                )
                .forEach((feedback: FeedbackItem) => {
                  feedback?.detection?.forEach((id) =>
                    // remove the sentence from the set if it is already in the set
                    currentSentenceIds.has(id)
                      ? currentSentenceIds.delete(id)
                      : null,
                  );
                });

              state.currentSelectedSentences = Array.from(currentSentenceIds);
            }
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
      setCurrentReferenceSentence: (sentence: number | null) =>
        set(
          produce((state) => {
            state.currentReferenceSentence = sentence;
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
  subscribeWithSelector(
    persist(
      (set) => ({
        revisionList: [],
        setRevisionList: (revisionList) => {
          set({ revisionList });

          eventTracker({
            action: "track revision list",
            data: {
              revisions: revisionList,
            },
          });
        },
        createRevision: () =>
          set(
            produce((state) => {
              state.revisionList.push({
                id: state.revisionList.length,
                conversation: [],
                feedback: [],
                revision: [],
                clusterDimension: "provider",
                numericalDimension: "none",
                colorDimension: "none",
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
                          clusterDimension: target.clusterDimension,
                          numericalDimension: target.numericalDimension,
                          colorDimension: target.colorDimension,
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
                  clusterDimension: target.clusterDimension,
                  numericalDimension: target.numericalDimension,
                  colorDimension: target.colorDimension,
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
  ),
);

useRevisionListStore.subscribe(
  (state) => state.revisionList,
  (newRevision, preRevision) => {
    console.log("Revision List Updated", newRevision, preRevision);
    eventTracker({
      action: "track revision list",
      data: {
        revisions: newRevision,
      },
    });
  },
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
