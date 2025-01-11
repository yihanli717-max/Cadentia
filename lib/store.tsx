import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
