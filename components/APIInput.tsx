"use client";
import React, { useState } from "react";
import { essay } from "@/data/essay";
import { feedback } from "@/data/feedback";
import {
  useOpenAIAPI,
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
} from "@/lib/store";
import { cn, countWords, getEmbedding } from "@/lib/utils";

const APIInput = () => {
  const [input, setIupt] = useState("");

  const setAPI = useOpenAIAPI((state) => state.setAPI);
  const setLoading = useSharedConfigStore((state) => state.setLoading);

  const loadDefaultData = async () => {
    useEssayStore.setState({ essay: essay });
    // useFeedbackStore.setState({ feedback: feedback })

    const allFeedback = useFeedbackStore.getState().feedback;
    if (allFeedback.length > 0) {
      return;
    }

    setLoading(true);

    // iterate over the feedback and calculate the sentence lengths of each feedback content
    const feedbackWithLengthAndEmbeddings = await Promise.all(
      feedback.map(async (item) => ({
        ...item,
        length: countWords(item.content),
        embeddings: await getEmbedding(item.content),
      })),
    ).then((result) => {
      setLoading(false);
      return result;
    });

    console.log(feedbackWithLengthAndEmbeddings);
    useFeedbackStore.setState({ feedback: feedbackWithLengthAndEmbeddings });
  };

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="flex flex-col gap-2 p-8 bg-white rounded-lg border w-[512px] select-none">
        <p>Hi there! Welcome to CritiqueComposer!</p>

        <div className="flex flex-col gap-2 w-full">
          <input
            type="text"
            value={input}
            placeholder="Your OpenAI API Key..."
            onChange={(event) => {
              setIupt(event.target.value);
            }}
            className="input input-bordered w-full text-sm"
          />
          <button
            className="btn"
            onClick={() => {
              setAPI(input);
              loadDefaultData();
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIInput;
