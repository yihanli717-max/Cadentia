import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Sentence, FeedbackItem, FeedbackSourceItem } from "@/lib/type";

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
