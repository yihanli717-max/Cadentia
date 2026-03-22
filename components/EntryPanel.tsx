"use client";
import React, { useState } from "react";
import { feedback as feedback0 } from "@/data/feedback0";
import { feedbackSource as feedbackSource0 } from "@/data/source0";
import { feedback as feedback1 } from "@/data/feedback1";
import { feedbackSource as feedbackSource1 } from "@/data/source1";
import { feedback as feedback2 } from "@/data/feedback2";
import { feedbackSource as feedbackSource2 } from "@/data/source2";
import {
  useOpenAIAPI,
  useEssayStore,
  useFeedbackStore,
  useFeedbackSourceStore,
  useSharedConfigStore,
  useStudyManagerStore,
} from "@/lib/store";
import { cn, countWords, eventTracker } from "@/lib/utils";
import { noto_serif } from "@/app/fonts";

interface EmbeddingData {
  id: number;
  embedding: number[];
}

interface EntryPanelProps {
  setStart: React.Dispatch<React.SetStateAction<boolean>>;
}

const EntryPanel = (props: EntryPanelProps) => {
  const [inputAPI, setIuptAPI] = useState("");
  const [inputID, setInputID] = useState("annonymous");

  const { setUser, dataset, setDataset } = useStudyManagerStore();
  const setAPI = useOpenAIAPI((state) => state.setAPI);
  const setLoading = useSharedConfigStore((state) => state.setLoading);

  const loadEmbeddings = async (
    filename: string,
  ): Promise<Map<number, number[]>> => {
    const response = await fetch(filename);
    const embeddingsData: EmbeddingData[] = await response.json();

    return new Map(embeddingsData.map((item) => [item.id, item.embedding]));
  };

  const loadDefaultData = async () => {
    const embeddingsMap =
      dataset === 0
        ? await loadEmbeddings("embeddings0.json")
        : dataset === 1
          ? await loadEmbeddings("embeddings1.json")
          : await loadEmbeddings("embeddings2.json");
    const feedback =
      dataset === 0 ? feedback0 : dataset === 1 ? feedback1 : feedback2;
    const feedbackSource =
      dataset === 0
        ? feedbackSource0
        : dataset === 1
          ? feedbackSource1
          : feedbackSource2;

    useEssayStore.setState({ essay: [] });
    useFeedbackSourceStore.setState({ feedbackSource: feedbackSource });
    // useFeedbackStore.setState({ feedback: feedback })

    // const allFeedback = useFeedbackStore.getState().feedback;
    // if (allFeedback.length > 0) {
    //   return;
    // }

    setLoading(true);

    // iterate over the feedback and calculate the sentence lengths of each feedback content
    const feedbackWithLengthAndEmbeddings = await Promise.all(
      feedback.map(async (item) => ({
        ...item,
        length: countWords(item.content),
        embeddings: embeddingsMap.get(item.id) || undefined,
      })),
    ).then((result) => {
      setLoading(false);
      setTimeout(() => {
        props.setStart(true);
      }, 500);
      return result;
    });

    console.log(feedbackWithLengthAndEmbeddings);
    useFeedbackStore.setState({ feedback: feedbackWithLengthAndEmbeddings });
  };

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="flex flex-col gap-3 p-8 bg-white rounded-lg border w-[512px] select-none">
        <p className={noto_serif.className}>👋 Hi there! Welcome to Synthia!</p>

        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            value={inputAPI}
            placeholder="Your OpenAI API Key..."
            onChange={(event) => {
              setIuptAPI(event.target.value);
            }}
            className="input input-bordered w-full text-xs rounded-md"
          />

          <div className="flex flex-col gap-2 items-center">
            {/* <input
              type="text"
              value={inputID}
              placeholder="Participant ID..."
              onChange={(event) => {
                setInputID(event.target.value);
              }}
              className="input input-bordered w-full text-xs"
            /> */}

            {/* <div className="dropdown">
              <div
                tabIndex={0}
                role="button"
                className="btn rounded-md text-xs flex flex-row gap-2 shadow-none w-28"
              >
                <span className="capitalize">Dataset #{dataset}</span>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-md z-[1] p-2 shadow text-2xs mt-1 w-28"
              >
                <li>
                  <a
                    onClick={() => setDataset(0)}
                    className={dataset === 0 ? "active" : ""}
                  >
                    Dataset #0
                  </a>
                </li>
                <li>
                  <a
                    onClick={() => setDataset(1)}
                    className={dataset === 1 ? "active" : ""}
                  >
                    Dataset #1
                  </a>
                </li>
                <li title="Justification is whether the feedback is justified with reasons.">
                  <a
                    onClick={() => setDataset(2)}
                    className={dataset === 2 ? "active" : ""}
                  >
                    Dataset #2
                  </a>
                </li>
              </ul>
            </div> */}

            {/* <div className="w-full">
              <div className="flex flex-row gap-2 items-center w-full">
                <label htmlFor="file" className="label w-28">
                  Essay
                </label>
                <input
                  type="file"
                  className="file-input file-input-bordered file-input-sm w-full "
                />
              </div>

              <div className="flex flex-row gap-2 items-center w-full">
                <label htmlFor="file" className="label w-28">
                  Feedback
                </label>
                <input
                  type="file"
                  className="file-input file-input-bordered file-input-sm w-full "
                  multiple
                />
              </div>
            </div> */}

            <button
              className="btn w-full"
              onClick={() => {
                // setAPI(inputAPI);
                setUser(inputID);
                loadDefaultData();
                setAPI(inputAPI);
                console.log("start study", inputID, dataset, inputAPI);
                eventTracker({
                  action: "start study",
                  data: {
                    id: inputID,
                    dataset: dataset,
                  },
                });
              }}
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryPanel;
