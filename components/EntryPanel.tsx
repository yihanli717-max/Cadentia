"use client";
import React, { useState } from "react";
import { essay as essay1 } from "@/data/essay1";
import { feedback as feedback1 } from "@/data/feedback1";
import { feedbackSource as feedbackSource1 } from "@/data/source1";
import { essay as essay2 } from "@/data/essay2";
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
import { cn, countWords, getEmbedding } from "@/lib/utils";
import { noto_serif } from "@/app/fonts";

interface EntryPanelProps {
  setStart: React.Dispatch<React.SetStateAction<boolean>>;
}

const EntryPanel = (props: EntryPanelProps) => {
  const [inputAPI, setIuptAPI] = useState("");
  const [inputID, setInputID] = useState("");
  const [dataset, setDataset] = useState("Dataset #1");

  const setUser = useStudyManagerStore((state) => state.setUser);
  const setAPI = useOpenAIAPI((state) => state.setAPI);
  const setLoading = useSharedConfigStore((state) => state.setLoading);

  const loadDefaultData = async () => {
    const essay = dataset === "Dataset #1" ? essay1 : essay2;
    const feedback = dataset === "Dataset #1" ? feedback1 : feedback2;
    const feedbackSource =
      dataset === "Dataset #1" ? feedbackSource1 : feedbackSource2;

    useEssayStore.setState({ essay: essay });
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
        embeddings: await getEmbedding(item.content),
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
      <div className="flex flex-col gap-2 p-8 bg-white rounded-lg border w-[512px] select-none">
        <p className={noto_serif.className}>👋 Hi there! Welcome to Synthia!</p>

        <div className="flex flex-col gap-2 w-full">
          {/* <input
            type="text"
            value={inputAPI}
            placeholder="Your OpenAI API Key..."
            onChange={(event) => {
              setIuptAPI(event.target.value);
            }}
            className="input input-bordered w-full text-xs rounded-md"
          /> */}

          <div className="flex flex-row gap-2 items-center">
            <input
              type="text"
              value={inputID}
              placeholder="Participant ID..."
              onChange={(event) => {
                setInputID(event.target.value);
              }}
              className="input input-bordered w-full text-xs"
            />

            <div className="dropdown">
              <div
                tabIndex={0}
                role="button"
                className="btn rounded-md text-xs flex flex-row gap-2 shadow-none w-28"
              >
                {/* <span className="opacity-40">Color by</span> */}
                <span className="capitalize">{dataset}</span>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-md z-[1] p-2 shadow text-2xs mt-1 w-28"
              >
                <li>
                  <a
                    onClick={() => setDataset("Dataset #1")}
                    className={dataset === "Dataset #1" ? "active" : ""}
                  >
                    Dataset #1
                  </a>
                </li>
                <li title="Justification is whether the feedback is justified with reasons.">
                  <a
                    onClick={() => setDataset("Dataset #2")}
                    className={dataset === "Dataset #2" ? "active" : ""}
                  >
                    Dataset #2
                  </a>
                </li>
              </ul>
            </div>
            <button
              className="btn btn-neutral text-xs"
              onClick={() => {
                // setAPI(inputAPI);
                setUser(inputID);
                loadDefaultData();
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryPanel;
